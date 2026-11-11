import { TestBed } from '@angular/core/testing';

import { VoltexState } from './voltex-state';

describe('VoltexState', () => {
  let service: VoltexState;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VoltexState);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
