import {parseEther} from 'viem';
export type SaleOffer={seller:string;buyer:string;amount:bigint;price:bigint;status:number};
export function saleActions(offer:SaleOffer,account:string){if(offer.status!==1)return [];if(account.toLowerCase()===offer.seller.toLowerCase())return ['cancel'];if(account.toLowerCase()===offer.buyer.toLowerCase())return ['buy'];return [];}
export function parseSalePrice(value:string){if(!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,18})?$/.test(value))throw Error('Enter a positive test ETH amount with at most 18 decimals');const price=parseEther(value);if(price<=0n)throw Error('Price must be positive');return price;}
