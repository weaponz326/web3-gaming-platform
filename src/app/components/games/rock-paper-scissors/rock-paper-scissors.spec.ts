import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RockPaperScissors } from './rock-paper-scissors';

describe('RockPaperScissors', () => {
  let component: RockPaperScissors;
  let fixture: ComponentFixture<RockPaperScissors>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RockPaperScissors]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RockPaperScissors);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
