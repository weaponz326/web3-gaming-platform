import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Battleship } from './battleship';

describe('Battleship', () => {
  let component: Battleship;
  let fixture: ComponentFixture<Battleship>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Battleship]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Battleship);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
