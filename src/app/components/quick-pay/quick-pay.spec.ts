import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuickPay } from './quick-pay';

describe('QuickPay', () => {
  let component: QuickPay;
  let fixture: ComponentFixture<QuickPay>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuickPay]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuickPay);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
