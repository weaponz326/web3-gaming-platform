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
  wagerPerGame: number = 0; // Added explicit wager per game
  isAI: boolean = false;
  gameCode: string = '';
  joinGameCode: string = '';
  error: string = '';
  successMessage: string = '';
  account: string | null = null;
  inviteLink: string = '';
  showCopyTooltip: boolean = false;
  isCreatingGame: boolean = false;
  isJoiningGame: boolean = false;

  // Contract address - should be moved to environment config
  private contractAddress = '0xYourContractAddress'; // Replace with actual contract address

  constructor(
    private web3Service: Web3Service, 
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.web3Service.account$.subscribe((account) => {
      this.account = account;
      // Removed hardcoded account assignment
    });

    // Check for game code in query params (for direct links)
    this.route.queryParams.subscribe((params) => {
      if (params['gameCode']) {
        this.joinGameCode = params['gameCode'];
      }
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
    if (this.wagerPerGame <= 0) {
      this.error = 'Wager per game must be greater than 0';
      return;
    }
    if (this.wagerPerGame > this.totalWager) {
      this.error = 'Wager per game cannot exceed total wager';
      return;
    }

    const signer = this.web3Service.getSigner();
    if (!signer) {
      this.error = 'Wallet not available';
      return;
    }

    this.isCreatingGame = true;
    this.error = '';

    const contract = new ethers.Contract(this.contractAddress, rpsAbi, signer);
    try {
      const tx = await contract['createGame'](
        ethers.parseEther(this.totalWager.toString()), 
        this.isAI
      );
      const receipt = await tx.wait();
      
      // Better event parsing - look for GameCreated event
      let gameCode = '';
      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'GameCreated') {
            gameCode = parsedLog.args['gameCode'];
            break;
          }
        } catch (e) {
          // Skip logs that can't be parsed
          continue;
        }
      }

      // Fallback: if no event found, use transaction hash as game code
      if (!gameCode) {
        gameCode = receipt.hash;
      }

      this.gameCode = gameCode;
      this.inviteLink = `${window.location.origin}/?gameCode=${gameCode}&game=rps`;
      this.successMessage = 'Game created successfully! Share the code with another player.';
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        this.successMessage = '';
      }, 5000);
      
      // Navigate to game with proper parameters
      this.router.navigate(['/rps'], { 
        queryParams: { 
          gameCode, 
          player1: this.account,
          totalWager: this.totalWager,
          wagerPerGame: this.wagerPerGame
        } 
      });
    } catch (error: any) {
      this.error = 'Failed to create game: ' + error.message;
      console.error('Create game error:', error);
    } finally {
      this.isCreatingGame = false;
    }
  }

  async joinGame() {
    if (!this.account) {
      this.error = 'Please connect your wallet';
      return;
    }
    if (!this.joinGameCode) {
      this.error = 'Please enter a game code';
      return;
    }
    if (this.totalWager <= 0) {
      this.error = 'Total wager must be greater than 0';
      return;
    }
    if (this.wagerPerGame <= 0) {
      this.error = 'Wager per game must be greater than 0';
      return;
    }

    const signer = this.web3Service.getSigner();
    if (!signer) {
      this.error = 'Wallet not available';
      return;
    }

    this.isJoiningGame = true;
    this.error = '';

    const contract = new ethers.Contract(this.contractAddress, rpsAbi, signer);
    try {
      // First, check if the game exists and get its details
      const gameDetails = await contract['games'](this.joinGameCode);
      
      if (gameDetails.player1 === ethers.ZeroAddress) {
        this.error = 'Game not found or invalid game code';
        return;
      }

      if (gameDetails.player2 !== ethers.ZeroAddress) {
        this.error = 'Game already has two players';
        return;
      }

      const tx = await contract['joinGame'](
        this.joinGameCode, 
        ethers.parseEther(this.totalWager.toString()), 
        ethers.parseEther(this.wagerPerGame.toString())
      );
      await tx.wait();
      
      this.router.navigate(['/rps'], { 
        queryParams: { 
          gameCode: this.joinGameCode, 
          player1: gameDetails.player1,
          player2: this.account,
          totalWager: this.totalWager,
          wagerPerGame: this.wagerPerGame
        } 
      });
    } catch (error: any) {
      this.error = 'Failed to join game: ' + error.message;
      console.error('Join game error:', error);
    } finally {
      this.isJoiningGame = false;
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
    if (!this.gameCode) {
      this.error = 'No game code to copy';
      return;
    }

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
   * Copy invite link to clipboard
   */
  async copyInviteLink() {
    if (!this.inviteLink) {
      this.error = 'No invite link to copy';
      return;
    }

    try {
      await navigator.clipboard.writeText(this.inviteLink);
      this.successMessage = 'Invite link copied to clipboard!';
      this.error = '';
      
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    } catch (err) {
      this.fallbackCopyTextToClipboard(this.inviteLink);
    }
  }

  /**
   * Share game code using Web Share API or fallback to clipboard
   */
  async shareGameCode() {
    if (!this.gameCode || !this.inviteLink) {
      this.error = 'No game to share';
      return;
    }

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
      console.error('Share error:', err);
    }
  }

  /**
   * Validate wager inputs
   */
  validateWagers() {
    if (this.wagerPerGame > this.totalWager) {
      this.error = 'Wager per game cannot exceed total wager';
    } else if (this.wagerPerGame > 0 && this.totalWager > 0) {
      this.error = '';
    }
  }

  /**
   * Calculate suggested wager per game (10% of total)
   */
  calculateSuggestedWager() {
    if (this.totalWager > 0) {
      this.wagerPerGame = Math.round(this.totalWager * 0.1 * 100) / 100; // 10% rounded to 2 decimals
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
        this.error = 'Failed to copy to clipboard';
      }
    } catch (err) {
      this.error = 'Failed to copy to clipboard';
    }
    
    document.body.removeChild(textArea);
  }

  /**
   * Check if wallet is connected
   */
  get isWalletConnected(): boolean {
    return !!this.account;
  }

  /**
   * Check if form is valid for creating game
   */
  get canCreateGame(): boolean {
    return this.isWalletConnected && 
           this.totalWager > 0 && 
           this.wagerPerGame > 0 && 
           this.wagerPerGame <= this.totalWager &&
           !this.isCreatingGame;
  }

  /**
   * Check if form is valid for joining game
   */
  get canJoinGame(): boolean {
    return this.isWalletConnected && 
           this.joinGameCode.length > 0 && 
           this.totalWager > 0 && 
           this.wagerPerGame > 0 &&
           !this.isJoiningGame;
  }
}