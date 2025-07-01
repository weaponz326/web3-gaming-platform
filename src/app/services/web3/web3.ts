import { Injectable } from '@angular/core';
  import Web3Modal from 'web3modal';
  import { ethers } from 'ethers';
  import { BehaviorSubject } from 'rxjs';

  @Injectable({
    providedIn: 'root',
  })
  export class Web3Service {
    private web3Modal: Web3Modal;
    private provider: any;
    private signer: ethers.Signer | null = null;
    private accountSubject = new BehaviorSubject<string | null>(null);

    account$ = this.accountSubject.asObservable();

    constructor() {
      const providerOptions = {
        // Add WalletConnect or other providers if needed
        // Example: walletconnect: { package: WalletConnectProvider, options: { infuraId: "YOUR_INFURA_ID" } }
      };
      this.web3Modal = new Web3Modal({
        network: 'mainnet', // or 'polygon' for L2
        cacheProvider: true,
        providerOptions,
      });
    }

    async connectWallet() {
      try {
        this.provider = await this.web3Modal.connect();
        const ethersProvider = new ethers.BrowserProvider(this.provider);
        this.signer = await ethersProvider.getSigner();
        const address = await this.signer.getAddress();
        this.accountSubject.next(address);
        return address;
      } catch (error) {
        console.error('Wallet connection failed:', error);
        throw error;
      }
    }

    async disconnectWallet() {
      await this.web3Modal.clearCachedProvider();
      this.provider = null;
      this.signer = null;
      this.accountSubject.next(null);
    }

    getSigner(): ethers.Signer | null {
      return this.signer;
    }
  }