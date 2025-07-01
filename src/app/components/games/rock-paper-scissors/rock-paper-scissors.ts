import { Component } from '@angular/core';
import { Web3Service } from '../../../services/web3/web3';
import { ethers } from 'ethers';
import rpsAbi from '../../../abis/rps.abis.json';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-rock-paper-scissors',
  imports: [CommonModule, FormsModule],
  templateUrl: './rock-paper-scissors.html',
  styleUrl: './rock-paper-scissors.scss'
})
export class RockPaperScissors {

  wager: number = 0;
  move: string = '';
  salt: string = Math.random().toString(36).substring(2);
  gameState: string = 'initial';
  result: string = '';
  contractAddress = '0xYourContractAddress'; // Replace with actual address

  constructor(private web3Service: Web3Service) {}

  async commitMove() {
    const signer = this.web3Service.getSigner();
    if (!signer) {
      alert('Please connect wallet');
      return;
    }
    const contract = new ethers.Contract(this.contractAddress, rpsAbi, signer);
    const moveHash = ethers.keccak256(
      ethers.toUtf8Bytes(this.move + this.salt)
    );
    try {
      const tx = await contract['commitMove'](this.wager, moveHash, {
        value: ethers.parseEther(this.wager.toString()),
      });
      await tx.wait();
      this.gameState = 'committed';
    } catch (error) {
      console.error('Commit failed:', error);
    }
  }

  async revealMove() {
    const signer = this.web3Service.getSigner();
    if (!signer) return;
    const contract = new ethers.Contract(this.contractAddress, rpsAbi, signer);
    try {
      const tx = await contract['revealMove'](Number(this.move), ethers.toUtf8Bytes(this.salt));
      await tx.wait();
      this.gameState = 'revealed';
    } catch (error) {
      console.error('Reveal failed:', error);
    }
  }

  async resolveMatch() {
    const signer = this.web3Service.getSigner();
    if (!signer) return;
    const contract = new ethers.Contract(this.contractAddress, rpsAbi, signer);
    try {
      const winner = await contract['resolveMatch']();
      this.result = winner === (await signer.getAddress()) ? 'You won!' : 'You lost!';
      this.gameState = 'resolved';
    } catch (error) {
      console.error('Resolve failed:', error);
    }
  }
    
}
