import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Karting } from './karting';

describe('Karting', () => {
  let component: Karting;
  let fixture: ComponentFixture<Karting>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Karting]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Karting);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
