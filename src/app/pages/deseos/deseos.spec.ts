import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Deseos } from './deseos';

describe('Deseos', () => {
  let component: Deseos;
  let fixture: ComponentFixture<Deseos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Deseos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Deseos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
