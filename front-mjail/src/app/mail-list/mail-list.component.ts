import {NgModule, Component, OnInit, Inject, HostListener, Input} from '@angular/core';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import {DOCUMENT, Title} from '@angular/platform-browser';
import * as Fuse from 'fuse.js';
import { PushNotificationsService} from 'ng-push';
import { ActivatedRoute } from '@angular/router'
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

    users: String[] = [];

    notifications: any[] = [];

    blacklist: any[] = [];

    blacklistUsers: String[] = [];

    lastNotif: any= null;

    lastMail: any;

    currentUser: String = '';

    wsConnected: Boolean = false;

    private wsHost: string;

    search: string = '';

    private fuseOptions: Object;

    route: string = '';

    baseUrl: string = '';

    constructor(@Inject(DOCUMENT) private document, private titleService: Title, router: ActivatedRoute, private _pushNotifications: PushNotificationsService) {

        this.baseUrl = location.origin;

        this._pushNotifications.requestPermission();

        this.route = router.snapshot.params.name;

        if (!this.route || this.route == 'Anonymous') {
          this.users = [''];
        }
        if (localStorage.getItem('notifications')) {
          this.notifications[''] = JSON.parse(localStorage.getItem('notifications'))[''];
        }
        if (localStorage.getItem('blacklist')) {
          this.blacklist[''] = JSON.parse(localStorage.getItem('blacklist'))[''];
        }

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

    copyLink(val: string) {
      document.addEventListener('copy', (e: ClipboardEvent) => {
        e.clipboardData.setData('text/plain', (val));
        e.preventDefault();
        document.removeEventListener('copy', null);
      });
      document.execCommand('copy');
      alert('lien copié dans le presse papier');
    }

    ngOnInit() {
        var blacklist = [];
        var data = JSON.parse(localStorage.getItem('blacklist'));
        for (let user in data) {
          this.blacklistUsers.push(user);
          this.blacklist[user] = data[user];
          if (data[user] === 1) {
            blacklist.push(user);
          }
        }
        this.titleService.setTitle('Connecting..');
        this.connect().then(() => {
            this.sendMessage('setForceChannel', this.route);
            this.sendMessage('setBlacklist', blacklist);
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
                        mail.id
                    ]);
                }
            }, 500);
        }
    }

    selectionSetRead() {
        let allId = this.mails.filter((m) => m.selected).map((m) => m.id);
        this.sendMessage('setRead', allId);
    }
    selectionSetUnread() {
        let allId = this.mails.filter((m) => m.selected).map((m) => m.id);
        this.sendMessage('setUnread', allId);
    }
    deleteAll() {
        this.sendMessage('deleteByUser', this.currentUser);
        this.lastMail = null;
    }
    selectionDelete() {
        let allId = this.mails.filter((m) => m.selected).map((m) => m.id);
        allId.map((id) => {
          if (this.lastMail && this.lastMail.id == id) {
            this.lastMail = null;
          }
        });
        this.sendMessage('delete', allId);
        this.lastMail = null;
    }

    userChange($event) {
        this.lastMail = null;
        this.currentUser = $event.nextId.split('tabUsers_')[1];
        this.mails.forEach((m) => {
            m.selected = false;
        });
        this.updateTitle();
        this.applyFilter();
    }

    notificationsClick(user) {
      var notifications = {};
      if (user) {
        if (this.notifications[user] === 0 || !this.notifications[user]) {
          this.notifications[user] = 1;
        } else {
          this.notifications[user] = 0;
        }
        if (!localStorage.getItem('notifications')) {
          for (let name in this.notifications) {
            notifications[name] = this.notifications[name];
          }
          localStorage.setItem('notifications', JSON.stringify(notifications));
        } else {
          notifications = JSON.parse(localStorage.getItem('notifications'));
          notifications[user] = this.notifications[user];
          localStorage.setItem('notifications', JSON.stringify(notifications))
        }
      }
    }

    userSettings(user, $event) {
      var blacklist = {};
      if (this.blacklist[user] === 0 || !this.blacklist[user]) {
        if (this.currentUser == user) {
          this.currentUser = null;
        }
        this.blacklist[user] = 1;
        var newMails = [];

        for (let index in this.mails) {
          if (this.mails[index].user != (user ? user : null)) {
            newMails[index] = this.mails[index];
          }
        }
        this.mails = newMails;
        for (let index in this.users) {
          if (this.users[index] == user) {
            this.users.splice(parseInt(index), 1);
          }
        }
      } else {
        this.blacklist[user] = 0;
        if (!this.users.includes(user)) {
          this.users.push(user);
        }
        this.sendMessage('getMailsUser', user);
      }

      if (!localStorage.getItem('blacklist')) {
        for (let name in this.blacklist) {
          blacklist[name] = this.blacklist[name];
        }
        localStorage.setItem('blacklist', JSON.stringify(blacklist));
      } else {
        blacklist = JSON.parse(localStorage.getItem('blacklist'));
        blacklist[user] = this.blacklist[user];
        localStorage.setItem('blacklist', JSON.stringify(blacklist))
      }

      var payload = [];
      for (let name in this.blacklist) {
        if (blacklist[name] == 1) {
          payload.push(name);
        }
      }

      this.sendMessage('setBlacklist', payload);

      //pour ne pas fermer le dropdown
      $event.stopPropagation();
    }

    onChildEvent($event) {
        switch ($event.type) {
            case 'deliverMail':
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
                    if (!this.route || mail.user == this.route) {
                      this.mails.unshift(mail);
                      if (mail.user && this.users.indexOf(mail.user) === -1) {
                        this.users.push(mail.user);
                        this.notifications[mail.user] = 0;
                        this.blacklist[mail.user] = 0;
                      }

                      //10 secondes entre chaque notifs
                      let diff = (new Date()).getTime() - this.lastNotif;
                      diff = Math.floor(diff / 1000) % 60;
                      if (
                        (this.notifications[mail.user] == 1 || (!mail.user && this.notifications[''] == 1)) &&
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
                    }
                } else if (message.type === 'setInit') {
                    message.payload.mails.forEach((mail) => {

                        if (mail.user && this.users.indexOf(mail.user) === -1) {
                            if (!this.route || mail.user == this.route) {
                              this.users.push(mail.user);
                              this.notifications[mail.user] = 0;
                            }
                        }

                        if (mail.user) {
                          if (!this.route  || mail.user == this.route) {
                            this.mails.push(mail);
                          }
                          if (localStorage.getItem('notifications')) {
                            this.notifications[mail.user] = JSON.parse(localStorage.getItem('notifications'))[mail.user];
                          }
                          if (localStorage.getItem('blacklist')) {
                            this.blacklist[mail.user] = JSON.parse(localStorage.getItem('blacklist'))[mail.user];
                          }
                          if (!this.blacklistUsers.includes(mail.user)) {
                            this.blacklistUsers.push(mail.user);
                          }
                        } else {
                          if (!this.route || this.route == 'Anonymous') {
                            this.mails.push(mail);
                          }
                        }
                    });

                    this.users.forEach((user) => {
                      if (this.blacklistUsers.indexOf(user) === -1) {
                        this.blacklistUsers.push(user);
                      }
                    })
                    this.applyFilter();
                    this.updateTitle();
                } else if (message.type === 'setRead') {

                    message.payload.forEach((messageId) => {

                        this.mails.forEach((m) => {
                            if (m.id == messageId) {
                                m.read = true;
                            }
                        })

                    });
                    this.updateTitle();
                } else if (message.type === 'setUnread') {

                    message.payload.forEach((messageId) => {

                        this.mails.forEach((m) => {
                            if (m.id == messageId) {
                                m.read = false;
                            }
                        })

                    });
                    this.updateTitle();
                } else if (message.type === 'deleted') {
                    message.payload.map((m) => {
                      if (this.lastMail && this.lastMail.id == m) {
                        this.lastMail = null
                      }
                    })
                    this.mails = this.mails.filter((m) => {
                        return message.payload.indexOf(m.id) === -1
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

        if (this.route) {
          this.currentUser = (this.route == 'Anonymous' ? '' : this.route);
        }
        let filterUser = this.mails.filter(item => (item.user === this.currentUser || (!item.user && !this.currentUser)));
        let filterRead = filterUser.filter(item => (!item.read));

        this.titleService.setTitle((this.route ? this.route : (this.currentUser ? this.currentUser : 'Anonymous')) + ' (' + filterRead.length + '/' + filterUser.length + ')');
    }


}
