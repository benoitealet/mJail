import {NgModule, Component, OnInit, Inject} from '@angular/core';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import {DOCUMENT, Title} from '@angular/platform-browser';

@NgModule({
    imports: [NgbModule]
})

@Component({
    selector: 'app-mail-list',
    templateUrl: './mail-list.component.html',
    styleUrls: ['./mail-list.component.scss'],
})

export class MailListComponent implements OnInit {


    mails: any[] = [];

    private ws: any;

    users: String[] = [''];

    lastMail: any;

    private currentUser: String = '';

    wsConnected: Boolean = false;

    search: string = '';
    searchTmp: string = '';

    private wsHost: string;

    constructor(@Inject(DOCUMENT) private document, private titleService: Title ) {
        this.wsHost = document.location.hostname + ':' + document.location.port;
    }

    ngOnInit() {
        this.titleService.setTitle('Connecting..');
        this.connect().then(() => {
            this.sendMessage('getInit', null);
        });

    }

    applySearch() {
        this.search = this.searchTmp;
    }

    private mailClick(mail, $event) {
        $event.stopPropagation();
        if (!$event.ctrlKey) {
            this.mails.forEach((m) => {
                if (m != mail) {
                    m.selected = false;
                }
            });
        }

        if ($event.shiftKey && this.lastMail) {
            let inSpan: boolean = false;
            this.mails.forEach((m) => {
                if ((m === mail || m === this.lastMail) && mail != this.lastMail) {
                    inSpan = !inSpan;
                }
                if (inSpan) {
                    m.selected = true;
                }
            })
            this.lastMail.selected = true;
            mail.selected = true;

        } else {

            if ($event.ctrlKey) {
                mail.selected = !mail.selected;
            } else {
                mail.selected = true;
            }
            this.lastMail = mail;
        }

        document.getSelection().removeAllRanges();

        if (!mail.read) {

            setTimeout(() => {
                if (mail.selected) {
                    //mail.read = true;
                    this.sendMessage('setRead', [
                        mail._id
                    ]);
                }
            }, 500);
        }
    }

    selectionSetRead() {
        let allId = this.mails.filter((m) => m.selected).map((m) => m._id);
        this.sendMessage('setRead', allId);
    }
    selectionSetUnread() {
        let allId = this.mails.filter((m) => m.selected).map((m) => m._id);
        this.sendMessage('setUnread', allId);
    }
    deleteAll() {
        this.sendMessage('deleteByUser', this.currentUser);
        this.lastMail = null;
    }
    selectionDelete() {
        let allId = this.mails.filter((m) => m.selected).map((m) => m._id);
        this.sendMessage('delete', allId);
        this.lastMail = null;
    }

    userChange($event) {
        this.lastMail = null;
        this.currentUser = this.users[$event.nextId.split('_')[1]];
        this.mails.forEach((m) => {
            m.selected = false;
        });
        this.updateTitle();
    }

    onChildEvent($event) {
        switch ($event.type) {
            case 'deliverMail':
                console.log('send deliverMail via ws');
                this.sendMessage('deliverMail', $event.mailData);
                break;

            default:
                console.warn('Unknown child event type: ', $event);
        }

    }



    private sendMessage(type, payload) {
        console.log('WS[' + type + '] -> ', payload);

        this.ws.send(JSON.stringify({
            type: type,
            payload: payload
        }));
    }



    private connect() {

        return new Promise((resolve) => {
            
            console.log('HTTP protocol: ', document.location.protocol);
            let protocol = 'ws';
            if(document.location.protocol === 'https:') {
                protocol = 'wss';
            }
            console.log('WS protocol: ', protocol);
            
            this.ws = new WebSocket(protocol + '://' + this.wsHost);
            this.ws.onopen = () => {
                console.log('Ws Connected');
                this.wsConnected = true;
                resolve();
            };

            this.ws.onmessage = (e) => {
                let message = JSON.parse(e.data);

                console.log('WS[' + message.type + '] <- ', message.payload);

                if (message.type === 'mailReceived') {
                    let mail = message.payload.mail;
                    this.mails.unshift(mail);
                    if (mail.user && this.users.indexOf(mail.user) === -1) {
                        this.users.push(mail.user);
                    }
                    this.updateTitle();
                } else if (message.type === 'setInit') {
                    message.payload.mails.forEach((mail) => {
                        this.mails.unshift(mail);

                        if (mail.user && this.users.indexOf(mail.user) === -1) {
                            this.users.push(mail.user);
                        }
                    });
                    this.updateTitle();
                } else if (message.type === 'setRead') {

                    message.payload.forEach((messageId) => {

                        this.mails.forEach((m) => {
                            if (m._id == messageId) {
                                m.read = true;
                            }
                        })

                    });
                    this.updateTitle();
                } else if (message.type === 'setUnread') {

                    message.payload.forEach((messageId) => {

                        this.mails.forEach((m) => {
                            if (m._id == messageId) {
                                m.read = false;
                            }
                        })

                    });
                    this.updateTitle();
                } else if (message.type === 'deleted') {
                    this.mails = this.mails.filter((m) => {
                        return message.payload.indexOf(m._id) === -1
                    })
                } else if (message.type === 'deletedByUser') {
                    let user = message.payload;
                    this.mails = this.mails.filter((m) => {
                        if (user) {
                            return user != m.user;
                        } else {
                            return m.user;
                        }
                    })
                }
            };

            this.ws.onclose = (e) => {
                console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
                this.wsConnected = false;
                setTimeout(() => {
                    this.connect();
                }, 1000);
            };

            this.ws.onerror = (err) => {
                console.error('Socket encountered error: ', err, 'Closing socket');
                this.wsConnected = false;
                this.ws.close();

                setTimeout(() => {
                    this.connect();
                }, 1000);
            };
        });
    }

    private updateTitle() {
        
        let filterUser = this.mails.filter(item => (item.user === this.currentUser || (!item.user && !this.currentUser)));
        
        console.log(filterUser);
        let filterRead = filterUser.filter(item => (!item.read));
        console.log(filterRead);
        
        this.titleService.setTitle((this.currentUser?this.currentUser:'Anonymous') + ' (' + filterRead.length + '/' + filterUser.length + ')');
    }


}
