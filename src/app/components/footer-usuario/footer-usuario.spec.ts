import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FooterUsuario } from './footer-usuario';

describe('FooterUsuario', () => {
  let component: FooterUsuario;
  let fixture: ComponentFixture<FooterUsuario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterUsuario]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FooterUsuario);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
