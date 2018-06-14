import {Component, EventEmitter, OnInit, Input, Output, Inject} from '@angular/core';
import {DOCUMENT} from '@angular/platform-browser';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';

import * as EmailValidator from 'email-validator';

@Component({
    selector: 'app-mail-view',
    templateUrl: './mail-view.component.html',
    styleUrls: ['./mail-view.component.scss']
})


export class MailViewComponent implements OnInit {
    @Input() mail: any;
    @Output() onEvent = new EventEmitter<Object>();
    deliverModal: any = null;
    externalSendAddress: string = '';

    private server: string;

    constructor(private modalService: NgbModal, @Inject(DOCUMENT) private document) {
        this.server = '//' + document.location.hostname + ':' + document.location.port;
    }

    ngOnInit() {
    }


    public generateAttachmentLink(mailId, contentId, fileName) {
        return this.server + '/getAttachment/' + mailId + '/' + contentId;
    }

    showDeliverPopup(popupDeliver, mail) {

        if (mail.to) {
            mail.to.forEach((to) => {
                to.deliveryEnabled = true;
            });

        }
        if (mail.cc) {
            mail.cc.forEach((cc) => {
                cc.deliveryEnabled = false;
            });

        }
        if (mail.bcc) {
            mail.bcc.forEach((bcc) => {
                bcc.deliveryEnabled = false;
            });

        }

        this.deliverModal = this.modalService.open(popupDeliver)
        this.deliverModal.result.then((result) => {
            console.log(`Closed with: ${result}`);
        }, (reason) => {
            console.log(`Dismissed ${(reason)}`);
        });
    }

    deliverMail() {
        let mailData = {
            id: this.mail._id,
            to: this.mail.to ? this.mail.to.filter((to) => to.deliveryEnabled) : [],
            cc: this.mail.cc ? this.mail.cc.filter((cc) => cc.deliveryEnabled) : [],
            bcc: this.mail.bcc ? this.mail.bcc.filter((bcc) => bcc.deliveryEnabled) : []
        };

        let cancel = false;
        if (this.externalSendAddress) {
            if (EmailValidator.validate(this.externalSendAddress)) {
                mailData.to.push({
                    address: this.externalSendAddress
                })
            } else {
                alert('Provided mail address is invalid');
                cancel = true;
            }
        }
        
        if(!cancel && (mailData.to.length + mailData.cc.length + mailData.bcc.length === 0)) {
            alert('No recipient provided');
            cancel = true;
        }
        if (!cancel) {
            this.onEvent.emit({
                type: 'deliverMail',
                mailData: mailData
            });
            this.deliverModal.close('Success');
        }
    }

}
