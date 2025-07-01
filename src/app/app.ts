import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Observable } from 'rxjs';
import { Web3Service } from './services/web3/web3';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'web3-gaming-platform';

  account$: Observable<string | null>;

  constructor(private web3Service: Web3Service) {
    this.account$ = this.web3Service.account$;
  }

  async connectWallet() {
    try {
      await this.web3Service.connectWallet();
    } catch (error) {
      console.error('Connection failed:', error);
    }
  }

  async disconnectWallet() {
    await this.web3Service.disconnectWallet();
  }

}
