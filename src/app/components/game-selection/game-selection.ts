import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Web3Service } from '../../services/web3/web3';
import { ethers } from 'ethers';
import rpsAbi from '../../abis/rps.abis.json';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-game-selection',
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './game-selection.html',
  styleUrl: './game-selection.scss'
})
export class GameSelection {
  selectedGame: string = 'rps';
  totalWager: number = 0;
  isAI: boolean = false;
  gameCode: string = '';
  joinGameCode: string = '';
  error: string = '';
  account: string | null = null;
  inviteLink: string = '';

  constructor(private web3Service: Web3Service, private router: Router) {}

  ngOnInit() {
    this.web3Service.account$.subscribe((account) => {
      this.account = account;
    });
  }

  async createGame() {
    // if (!this.account) {
    //   this.error = 'Please connect your wallet';
    //   return;
    // }
    // if (this.totalWager <= 0) {
    //   this.error = 'Total wager must be greater than 0';
    //   return;
    // }

    const signer = this.web3Service.getSigner();
    // if (!signer) {
    //   this.error = 'Wallet not available';
    //   return;
    // }

    const contract = new ethers.Contract('0xYourContractAddress', rpsAbi, signer);
    try {
      const tx = await contract['createGame'](ethers.parseEther(this.totalWager.toString()), this.isAI);
      const receipt = await tx.wait();
      const gameCode = receipt.logs[0].topics[1]; // Extract gameCode from GameCreated event
      this.gameCode = gameCode;
      this.inviteLink = `${window.location.origin}/?gameCode=${gameCode}&game=rps`;
      this.error = '';
      this.router.navigate(['/rps'], { queryParams: { gameCode, player1: this.account } });
    } catch (error: any) {
      this.error = 'Failed to create game: ' + error.message;
    }
  }

  async joinGame() {
    // if (!this.account) {
    //   this.error = 'Please connect your wallet';
    //   return;
    // }
    // if (!this.joinGameCode || this.totalWager <= 0) {
    //   this.error = 'Invalid game code or wager';
    //   return;
    // }

    const signer = this.web3Service.getSigner();
    // if (!signer) {
    //   this.error = 'Wallet not available';
    //   return;
    // }

    const contract = new ethers.Contract('0xYourContractAddress', rpsAbi, signer);
    try {
      const tx = await contract['joinGame'](this.joinGameCode, ethers.parseEther(this.totalWager.toString()), ethers.parseEther((this.totalWager / 10).toString()));
      await tx.wait();
      this.router.navigate(['/rps'], { queryParams: { gameCode: this.joinGameCode, player1: null, player2: this.account } });
      this.error = '';
    } catch (error: any) {
      this.error = 'Failed to join game: ' + error.message;
    }
  }

  selectGame(game: string) {
    this.selectedGame = game;
    this.error = '';
    this.inviteLink = '';
    this.gameCode = '';
    this.joinGameCode = '';
  }
}
