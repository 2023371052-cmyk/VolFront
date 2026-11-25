import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DriftingComponent } from './drifting';

describe('Drifting', () => {
  let component: DriftingComponent;
  let fixture: ComponentFixture<DriftingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriftingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DriftingComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
