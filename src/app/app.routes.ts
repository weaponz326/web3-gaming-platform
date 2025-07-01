import { Routes } from '@angular/router';
import { GameSelection } from './components/game-selection/game-selection';
import { RockPaperScissors } from './components/games/rock-paper-scissors/rock-paper-scissors';
import { TicTacToe } from './components/games/tic-tac-toe/tic-tac-toe';
import { Battleship } from './components/games/battleship/battleship';

export const routes: Routes = [
    { path: '', component: GameSelection },
    { path: 'rps', component: RockPaperScissors },
    { path: 'tic-tac-toe', component: TicTacToe },
    { path: 'battleship', component: Battleship },
    { path: '**', redirectTo: '' },
];
