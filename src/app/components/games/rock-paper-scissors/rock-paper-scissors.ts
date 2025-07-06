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
  move: number = 0; // Changed to number to match contract enum
  salt: string = Math.random().toString(36).substring(2);
  gameState: string = 'created';
  roundResult: string = '';
  player1Balance: number = 0;
  player2Balance: number = 0;
  roundNumber: number = 0;
  countdown: number = 30;
  timerSubscription: Subscription | any;
  error: string = '';
  account: string | null = null;
  contractAddress = '0xYourContractAddress'; // Replace with actual Sepolia contract address

  // Move enum mapping
  moveNames: { [key: number]: string } = {
    0: 'Rock',
    1: 'Paper',
    2: 'Scissors'
  };

  constructor(
    private web3Service: Web3Service,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    // Subscribe to account changes
    this.web3Service.account$.subscribe((account) => {
      this.account = account;
      // Removed hardcoded account assignment
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
      
      // Updated to match actual game states
      const gameStates = ['created', 'negotiating', 'committed', 'revealed', 'resolved', 'ended'];
      this.gameState = gameStates[Number(game.state)] || 'unknown';
      
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
    if (this.move === undefined || this.move === null) {
      this.error = 'Please select a move';
      return;
    }

    const signer = this.web3Service.getSigner();
    if (!signer) {
      this.error = 'Wallet not available';
      return;
    }

    const contract = new ethers.Contract(this.contractAddress, rpsAbi, signer);
    
    // Fixed: Create hash with move as number and salt as bytes32
    const moveBytes = ethers.zeroPadValue(ethers.toBeHex(this.move), 32);
    const saltBytes = ethers.zeroPadValue(ethers.toUtf8Bytes(this.salt), 32);
    const moveHash = ethers.keccak256(ethers.concat([moveBytes, saltBytes]));
    
    try {
      // Fixed: Use correct function name from ABI
      const tx = await contract['commitstagramMove'](this.gameCode, moveHash);
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
      // Fixed: Use consistent salt encoding
      const saltBytes = ethers.zeroPadValue(ethers.toUtf8Bytes(this.salt), 32);
      const tx = await contract['revealMove'](this.gameCode, this.move, saltBytes);
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

  selectMove(move: number) {
    this.move = move;
    this.error = '';
  }

  // Helper method to get move name for display
  getMoveName(move: number): string {
    return this.moveNames[move] || 'Unknown';
  }

  // Helper method to check if it's the current player's turn
  isCurrentPlayer(): boolean {
    return this.account === this.player1Address || this.account === this.player2Address;
  }

  // Helper method to get current player role
  getCurrentPlayerRole(): string {
    if (this.account === this.player1Address) return 'Player 1';
    if (this.account === this.player2Address) return 'Player 2';
    return 'Spectator';
  }
}