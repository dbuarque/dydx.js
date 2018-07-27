import web3Utils from 'web3-utils';

export class ZeroExHelper {
  constructor() {}

  private toBytes(val) {
    return web3Utils.hexToBytes(
        web3Utils.padLeft(web3Utils.toHex(val), 64),
      );
  }

  public orderToBytes(order) {
    const v = [].concat(this.toBytes(order.maker))
        .concat(this.toBytes(order.taker))
        .concat(this.toBytes(order.feeRecipient))
        .concat(this.toBytes(order.makerTokenAmount))
        .concat(this.toBytes(order.takerTokenAmount))
        .concat(this.toBytes(order.makerFee))
        .concat(this.toBytes(order.takerFee))
        .concat(this.toBytes(order.expirationUnixTimestampSec))
        .concat(this.toBytes(order.salt))
        .concat(this.toBytes(order.ecSignature.v))
        .concat(this.toBytes(order.ecSignature.r))
        .concat(this.toBytes(order.ecSignature.s));
    return web3Utils.bytesToHex(v);
  }
}
