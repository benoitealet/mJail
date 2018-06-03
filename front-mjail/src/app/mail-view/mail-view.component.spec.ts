import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MailViewComponent } from './mail-view.component';

describe('MailViewComponent', () => {
  let component: MailViewComponent;
  let fixture: ComponentFixture<MailViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MailViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MailViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
