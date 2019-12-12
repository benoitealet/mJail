import {NgModule, Component, OnInit, Inject, HostListener, Input} from '@angular/core';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import {DOCUMENT, Title} from '@angular/platform-browser';
import * as Fuse from 'fuse.js';
import { PushNotificationsService} from 'ng-push';
import {forEach} from '@angular/router/src/utils/collection';

@NgModule({
    imports: [NgbModule]
})

@Component({
    selector: 'app-mail-list',
    templateUrl: './mail-list.component.html',
    styleUrls: ['./mail-list.component.scss'],
    providers: [PushNotificationsService],
})

export class MailListComponent implements OnInit {

    mails: any[] = [];

    filteredMails: any[] = [];

    private ws: any;

    users: String[] = [''];

    notifications: any[] = [];

    lastNotif: any= null;

    lastMail: any;

    currentUser: String = '';

    wsConnected: Boolean = false;

    private wsHost: string;

    search: string = '';

    private fuseOptions: Object;

    constructor(@Inject(DOCUMENT) private document, private titleService: Title, private _pushNotifications: PushNotificationsService) {

        this._pushNotifications.requestPermission();

        this.wsHost = document.location.hostname + ':' + document.location.port;

        this.fuseOptions = {
            shouldSort: true,
            tokenize: true,
            matchAllTokens: true,
            threshold: 0,
            location: 0,
            distance: 100,
            maxPatternLength: 32,
            minMatchCharLength: 2,
            keys: [
                "subject",
                "from.address",
                "from.name",
                "to.address",
                "to.name",
            ]
        };
    }

    ngOnInit() {
        this.titleService.setTitle('Connecting..');
        this.connect().then(() => {
            this.sendMessage('getInit', null);
        });

    }

    applyFilter() {
        this.filteredMails = [];
        this.filteredMails = this.mails.filter((m) => {
            return ((m.user || null) === (this.currentUser || null))
        });
        if (this.search) {
            let fuse = new Fuse(this.filteredMails, this.fuseOptions); // "list" is the item array
            this.filteredMails = fuse.search(this.search);
        }

    }

    @HostListener('window:keyup', ['$event'])
    keyEvent(event: KeyboardEvent) {


        if (event.key === 'Delete') {
            let exit = false;
            let lastIndex = null;
            for (let i = 0; i < this.filteredMails.length && !exit; i++) {
                if (this.filteredMails[i] == this.lastMail) {
                    lastIndex = i;
                    exit = true;
                }
            }
            this.selectionDelete();
            setTimeout(() => {
                if (exit && this.filteredMails[lastIndex]) {
                    this.lastMail = this.filteredMails[lastIndex];
                    this.lastMail.selected = true;
                }
            }, 100);
        } else if (event.key === 'a' && event.ctrlKey) {
            this.filteredMails.forEach((m) => m.selected = true);
            event.preventDefault();
            event.stopPropagation();

            if (window.getSelection) {
                if (window.getSelection().empty) {  // Chrome
                    window.getSelection().empty();
                } else if (window.getSelection().removeAllRanges) {  // Firefox
                    window.getSelection().removeAllRanges();
                }
            }

        } else if (event.key === 'ArrowUp') {
            //get selected
            let exit = false;
            for (let i = 0; i < this.filteredMails.length && !exit; i++) {
                if (i > 0 && this.filteredMails[i] == this.lastMail) {
                    if (!event.shiftKey) {
                        this.filteredMails.forEach((m) => {
                            m.selected = false
                        });
                    }
                    this.filteredMails[i - 1].selected = true;
                    this.lastMail = this.filteredMails[i - 1];
                    exit = true;
                }
            }
        } else if (event.key === 'ArrowDown') {
            //get selected
            let exit = false;
            for (let i = 0; i < this.filteredMails.length - 1 && !exit; i++) {
                if (this.filteredMails[i] == this.lastMail) {
                    if (!event.shiftKey) {
                        this.filteredMails.forEach((m) => {
                            m.selected = false
                        });
                    }
                    this.filteredMails[i + 1].selected = true;
                    this.lastMail = this.filteredMails[i + 1];
                    exit = true;
                }
            }
        }


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
        this.currentUser = $event.nextId.split('_')[1];
        this.mails.forEach((m) => {
            m.selected = false;
        });
        this.updateTitle();
        this.applyFilter();
    }

    notificationsClick(user) {
      if (user) {
        if (this.notifications[user] === 0) {
          this.notifications[user] = 1;
        } else {
          this.notifications[user] = 0;
        }
        localStorage.setItem(user, this.notifications[user]);
      }
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
            if (document.location.protocol === 'https:') {
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
                        this.notifications[mail.user] = 0;
                    }

                    //10 secondes entre chaque notifs
                    let diff = (new Date()).getTime() - this.lastNotif;
                    diff = Math.floor(diff/1000) % 60;
                    if (
                      (this.notifications[mail.user] == 1 || (!mail.user && this.notifications['__Anonymous'] == 1) ) &&
                      (diff > 10 || !this.lastNotif)
                    ) {
                      this.lastNotif = (new Date()).getTime();
                      this._pushNotifications.create(
                        'New Mail',
                        {
                          body: 'New Mail from ' + mail.from.address + ' in ' + mail.user,
                          icon: 'assets/favicon.png',
                        }
                      ).subscribe(resolve => {
                        if (resolve.event.type === 'click') {
                          if (mail.user) {
                            document.getElementById('tabUsers_' + mail.user).click();
                          }
                          this.mails.forEach((m) => {
                            m.selected = false;
                          })
                          this.lastMail = mail;
                          this.lastMail.selected = true;
                          this.lastMail.read = true;
                          window.focus();
                        }
                      })
                    }
                    this.applyFilter();
                    this.updateTitle();
                } else if (message.type === 'setInit') {
                    message.payload.mails.forEach((mail) => {
                        this.mails.push(mail);

                        if (mail.user && this.users.indexOf(mail.user) === -1) {
                            this.users.push(mail.user);
                            this.notifications[mail.user] = 0;
                        }

                        if (mail.user) {
                          this.notifications[mail.user] = localStorage.getItem(mail.user);
                        } else {
                          this.notifications['__Anonymous'] = localStorage.getItem('__Anonymous');
                        }
                    });
                    this.applyFilter();
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
                    this.applyFilter();
                    this.updateTitle();
                } else if (message.type === 'deletedByUser') {
                    let user = message.payload;
                    this.mails = this.mails.filter((m) => {
                        if (user) {
                            return user != m.user;
                        } else {
                            return m.user;
                        }
                    })
                    this.applyFilter();
                    this.updateTitle();
                }
            };

            this.ws.onclose = (e) => {
                console.error('Socket has been closed: ', e);
                this.wsConnected = false;
                /*setTimeout(() => {
                    this.connect();
                }, 1000);*/
            };

            this.ws.onerror = (err) => {
                console.error('Socket encountered error: ', err);
                this.wsConnected = false;
                //this.ws.close();

                /*setTimeout(() => {
                    this.connect();
                }, 1000);*/
            };
        });
    }

    private updateTitle() {

        let filterUser = this.mails.filter(item => (item.user === this.currentUser || (!item.user && !this.currentUser)));
        let filterRead = filterUser.filter(item => (!item.read));

        this.titleService.setTitle((this.currentUser ? this.currentUser : 'Anonymous') + ' (' + filterRead.length + '/' + filterUser.length + ')');
    }


}
