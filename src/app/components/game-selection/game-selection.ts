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
  successMessage: string = '';
  account: string | null = null;
  inviteLink: string = '';
  showCopyTooltip: boolean = false;

  constructor(private web3Service: Web3Service, private router: Router) {}

  ngOnInit() {
    this.web3Service.account$.subscribe((account) => {
      this.account = account;
    });
  }

  async createGame() {
    if (!this.account) {
      this.error = 'Please connect your wallet';
      return;
    }
    if (this.totalWager <= 0) {
      this.error = 'Total wager must be greater than 0';
      return;
    }

    const signer = this.web3Service.getSigner();
    if (!signer) {
      this.error = 'Wallet not available';
      return;
    }

    const contract = new ethers.Contract('0xYourContractAddress', rpsAbi, signer);
    try {
      const tx = await contract['createGame'](ethers.parseEther(this.totalWager.toString()), this.isAI);
      const receipt = await tx.wait();
      const gameCode = receipt.logs[0].topics[1]; // Extract gameCode from GameCreated event
      this.gameCode = gameCode;
      this.inviteLink = `${window.location.origin}/?gameCode=${gameCode}&game=rps`;
      this.error = '';
      this.successMessage = 'Game created successfully! Share the code with another player.';
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        this.successMessage = '';
      }, 5000);
      
      this.router.navigate(['/rps'], { queryParams: { gameCode, player1: this.account } });
    } catch (error: any) {
      this.error = 'Failed to create game: ' + error.message;
    }
  }

  async joinGame() {
    if (!this.account) {
      this.error = 'Please connect your wallet';
      return;
    }
    if (!this.joinGameCode || this.totalWager <= 0) {
      this.error = 'Invalid game code or wager';
      return;
    }

    const signer = this.web3Service.getSigner();
    if (!signer) {
      this.error = 'Wallet not available';
      return;
    }

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
    this.successMessage = '';
    this.inviteLink = '';
    this.gameCode = '';
    this.joinGameCode = '';
  }

  /**
   * Copy game code to clipboard
   */
  async copyGameCode() {
    try {
      await navigator.clipboard.writeText(this.gameCode);
      this.showCopyTooltip = true;
      this.error = '';
      
      // Hide tooltip after 2 seconds
      setTimeout(() => {
        this.showCopyTooltip = false;
      }, 2000);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      this.fallbackCopyTextToClipboard(this.gameCode);
    }
  }

  /**
   * Share game code using Web Share API or fallback to clipboard
   */
  async shareGameCode() {
    const shareData = {
      title: 'Join my Rock Paper Scissors game!',
      text: `Use game code: ${this.gameCode}`,
      url: this.inviteLink
    };

    try {
      // Check if Web Share API is supported
      if (navigator.share) {
        await navigator.share(shareData);
        this.successMessage = 'Game invitation shared successfully!';
      } else {
        // Fallback: copy full invitation to clipboard
        const shareText = `Join my Rock Paper Scissors game! Game code: ${this.gameCode} - ${this.inviteLink}`;
        await navigator.clipboard.writeText(shareText);
        this.successMessage = 'Game invitation copied to clipboard!';
      }
      
      this.error = '';
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    } catch (err) {
      this.error = 'Failed to share game code';
    }
  }

  /**
   * Fallback method for copying text to clipboard
   */
  private fallbackCopyTextToClipboard(text: string) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Avoid scrolling to bottom
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        this.showCopyTooltip = true;
        setTimeout(() => {
          this.showCopyTooltip = false;
        }, 2000);
      } else {
        this.error = 'Failed to copy game code';
      }
    } catch (err) {
      this.error = 'Failed to copy game code';
    }
    
    document.body.removeChild(textArea);
  }
}