import { Component } from '@angular/core';
import { Web3Service } from '../../../services/web3/web3';
import { ethers, Subscription } from 'ethers';
import rpsAbi from '../../../abis/rps.abis.json';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { interval } from 'rxjs';

@Component({
  selector: 'app-rock-paper-scissors',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './rock-paper-scissors.html',
  styleUrl: './rock-paper-scissors.scss'
})
export class RockPaperScissors {
 gameCode: string = '';
  player1Address: string = '';
  player2Address: string | null = null;
  totalWager: number = 0;
  wagerPerGame: number = 0;
  move: string = '';
  salt: string = Math.random().toString(36).substring(2);
  gameState: string = 'created';
  roundResult: string = '';
  player1Balance: number = 0;
  player2Balance: number = 0;
  roundNumber: number = 0;
  countdown: number = 30;
  timerSubscription: Subscription | any;
  error: string = '';
  account: string | null = null; // Added account property
  contractAddress = '0xYourContractAddress'; // Replace with actual Sepolia contract address

  constructor(
    private web3Service: Web3Service,
    private route: ActivatedRoute,
    private router: Router // Added Router for navigation
  ) {}

  ngOnInit() {
    // Subscribe to account changes
    this.web3Service.account$.subscribe((account) => {
      this.account = account;
      this.fetchGameState(); // Refresh game state when account changes
    });

    // Get query params
    this.route.queryParams.subscribe((params) => {
      this.gameCode = params['gameCode'] || '';
      this.player1Address = params['player1'] || '';
      this.player2Address = params['player2'] || null;
      this.fetchGameState();
    });

    this.startCountdown();
  }

  ngOnDestroy() {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }

  async fetchGameState() {
    if (!this.account) return; // Wait for account to be set

    const signer = this.web3Service.getSigner();
    if (!signer) return;

    const contract = new ethers.Contract(this.contractAddress, rpsAbi, signer);
    try {
      const game = await contract['games'](this.gameCode);
      this.totalWager = Number(ethers.formatEther(game.totalWager));
      this.wagerPerGame = Number(ethers.formatEther(game.wagerPerGame));
      this.player1Balance = Number(ethers.formatEther(game.player1Balance));
      this.player2Balance = Number(ethers.formatEther(game.player2Balance));
      this.roundNumber = Number(game.roundNumber);
      this.gameState = ['created', 'negotiating', 'committed', 'revealed', 'resolved', 'ended'][Number(game.state)];
      if (this.gameState === 'ended') {
        this.roundResult = 'Game ended!';
        this.timerSubscription?.unsubscribe();
      }
    } catch (error: any) {
      this.error = 'Failed to fetch game state: ' + error.message;
    }
  }

  startCountdown() {
    this.countdown = 30;
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    this.timerSubscription = interval(1000).subscribe(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        this.error = 'Time expired! Please try again.';
        this.timerSubscription?.unsubscribe();
      }
    });
  }

  async proposeWager() {
    if (this.wagerPerGame <= 0) {
      this.error = 'Wager per game must be greater than 0';
      return;
    }

    const signer = this.web3Service.getSigner();
    if (!signer) {
      this.error = 'Wallet not available';
      return;
    }

    const contract = new ethers.Contract(this.contractAddress, rpsAbi, signer);
    try {
      const tx = await contract['proposeWager'](this.gameCode, ethers.parseEther(this.wagerPerGame.toString()));
      await tx.wait();
      await this.fetchGameState();
      this.error = '';
      this.startCountdown();
    } catch (error: any) {
      this.error = 'Failed to propose wager: ' + error.message;
    }
  }

  async commitMove() {
    if (!this.move) {
      this.error = 'Please select a move';
      return;
    }

    const signer = this.web3Service.getSigner();
    if (!signer) {
      this.error = 'Wallet not available';
      return;
    }

    const contract = new ethers.Contract(this.contractAddress, rpsAbi, signer);
    const moveHash = ethers.keccak256(ethers.concat([ethers.toUtf8Bytes(this.move), ethers.toUtf8Bytes(this.salt)]));
    try {
      const tx = await contract['commitMove'](this.gameCode, moveHash);
      await tx.wait();
      await this.fetchGameState();
      this.error = '';
      this.startCountdown();
    } catch (error: any) {
      this.error = 'Failed to commit move: ' + error.message;
    }
  }

  async revealMove() {
    const signer = this.web3Service.getSigner();
    if (!signer) {
      this.error = 'Wallet not available';
      return;
    }

    const contract = new ethers.Contract(this.contractAddress, rpsAbi, signer);
    try {
      const tx = await contract['revealMove'](this.gameCode, Number(this.move), ethers.toUtf8Bytes(this.salt));
      await tx.wait();
      await this.fetchGameState();
      this.error = '';
      this.timerSubscription?.unsubscribe();
    } catch (error: any) {
      this.error = 'Failed to reveal move: ' + error.message;
    }
  }

  async quitGame() {
    const signer = this.web3Service.getSigner();
    if (!signer) {
      this.error = 'Wallet not available';
      return;
    }

    const contract = new ethers.Contract(this.contractAddress, rpsAbi, signer);
    try {
      const tx = await contract['quitGame'](this.gameCode);
      await tx.wait();
      this.gameState = 'ended';
      this.roundResult = 'Game ended!';
      this.error = '';
      this.router.navigate(['']); // Navigate back to game selection
    } catch (error: any) {
      this.error = 'Failed to quit game: ' + error.message;
    }
  }

  selectMove(move: string) {
    this.move = move;
    this.error = '';
  }

}
