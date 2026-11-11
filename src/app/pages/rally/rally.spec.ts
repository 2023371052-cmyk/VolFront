import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Rally } from './rally';

describe('Rally', () => {
  let component: Rally;
  let fixture: ComponentFixture<Rally>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Rally]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Rally);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
