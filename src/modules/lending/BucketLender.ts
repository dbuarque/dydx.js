import BigNumber  from 'bignumber.js';
import bluebird from 'bluebird';
import Contracts from '../../lib/Contracts';
import Margin from '../Margin';
import {
  getPositionId,
  convertInterestRateFromProtocol,
  convertInterestRateToProtocol,
  getCurrentEpochSeconds,
} from '../../lib/Helpers';
import { Deposit } from '../../types/BucketLender';
import { BIG_NUMBERS } from '../../lib/Constants';
import { validateUint32 } from '../../lib/Validations';
import {
  ContractCallOptions,
  BucketLenderSummary,
  LenderSummaryOptions,
} from '../../types';
import Interest from '../helpers/Interest';
import MathHelpers from '../helpers/MathHelpers';

export default class BucketLender {

  private margin: Margin;
  private contracts: Contracts;

  private math: MathHelpers;
  private interest: Interest;

  constructor(
    margin: Margin,
    contracts: Contracts,
  ) {
    this.margin = margin;
    this.contracts = contracts;

    this.math = new MathHelpers();
    this.interest = new Interest();
  }

  public async createWithRecoveryDelay(
    owner: string,
    positionOpener: string,
    positionNonce: BigNumber,
    heldToken: string,
    owedToken: string,
    bucketTime: BigNumber,
    positionInterestRate: BigNumber,
    positionInterestPeriod: BigNumber,
    positionMaximumDuration: BigNumber,
    positionCallTimeLimit: BigNumber,
    minHeldTokenPerPrincipalNumerator: BigNumber,
    minHeldTokenPerPrincipalDenominator: BigNumber,
    marginCallers: string[],
    trustedWithdrawers: string[],
    recoveryDelay: BigNumber,
    from: string,
    options: ContractCallOptions = {},
  ): Promise<object> {
    trustedWithdrawers.push(this.contracts.bucketLenderProxy.address);
    validateUint32(minHeldTokenPerPrincipalNumerator);
    validateUint32(minHeldTokenPerPrincipalDenominator);

    const positionId = getPositionId(positionOpener, positionNonce);
    const BucketLenderRecoveryDelay: any = this.contracts.BucketLenderRecoveryDelay;
    const { address: bucketLenderAddress } = await this.contracts.createNewContract(
      BucketLenderRecoveryDelay,
      { ...options, from },
      this.contracts.margin.address,
      positionId,
      heldToken,
      owedToken,
      [
        bucketTime,
        convertInterestRateToProtocol(positionInterestRate),
        positionInterestPeriod,
        positionMaximumDuration,
        positionCallTimeLimit,
        minHeldTokenPerPrincipalNumerator,
        minHeldTokenPerPrincipalDenominator,
      ],
      marginCallers,
      trustedWithdrawers,
      recoveryDelay,
    );

    await this.transferOwnership(
      bucketLenderAddress,
      from,
      owner,
      options,
    );

    return { address: bucketLenderAddress };
  }

  public async create(
    owner: string,
    positionOpener: string,
    positionNonce: BigNumber,
    heldToken: string,
    owedToken: string,
    bucketTime: BigNumber,
    positionInterestRate: BigNumber,
    positionInterestPeriod: BigNumber,
    positionMaximumDuration: BigNumber,
    positionCallTimeLimit: BigNumber,
    minHeldTokenPerPrincipalNumerator: BigNumber,
    minHeldTokenPerPrincipalDenominator: BigNumber,
    marginCallers: string[],
    trustedWithdrawers: string[],
    from: string,
    options: ContractCallOptions = {},
  ): Promise<object> {
    if (owedToken.toLowerCase() === this.contracts.WETH9.address.toLowerCase()) {
      trustedWithdrawers.push(this.contracts.bucketLenderProxy.address);
    }
    validateUint32(minHeldTokenPerPrincipalNumerator);
    validateUint32(minHeldTokenPerPrincipalDenominator);

    const positionId = getPositionId(positionOpener, positionNonce);
    const BucketLender: any = this.contracts.BucketLender;
    const { address: bucketLenderAddress } = await this.contracts.createNewContract(
      BucketLender,
      { ...options, from },
      this.contracts.margin.address,
      positionId,
      heldToken,
      owedToken,
      [
        bucketTime,
        convertInterestRateToProtocol(positionInterestRate),
        positionInterestPeriod,
        positionMaximumDuration,
        positionCallTimeLimit,
        minHeldTokenPerPrincipalNumerator,
        minHeldTokenPerPrincipalDenominator,
      ],
      marginCallers,
      trustedWithdrawers,
    );

    await this.transferOwnership(
      bucketLenderAddress,
      from,
      owner,
      options,
    );

    return { address: bucketLenderAddress };
  }

  public async deposit(
    bucketLenderAddress: string,
    depositor: string,
    amount: BigNumber,
    options: ContractCallOptions = {},
  ): Promise<object> {
    return this.contracts.callContractFunction(
      this.contracts.bucketLenderProxy.deposit,
      { ...options, from: depositor },
      bucketLenderAddress,
      amount,
    );
  }

  public async depositETH(
    bucketLenderAddress: string,
    depositor: string,
    amount: BigNumber,
    options: ContractCallOptions = {},
  ): Promise<object> {
    return this.contracts.callContractFunction(
      this.contracts.bucketLenderProxy.depositEth,
      { ...options, from: depositor, value: amount },
      bucketLenderAddress,
    );
  }

  public async depositETHV1(
    bucketLenderAddress: string,
    depositor: string,
    beneficiary: string,
    amount: BigNumber,
    options: ContractCallOptions = {},
  ): Promise<object> {
    return this.contracts.callContractFunction(
      this.contracts.ethWrapperForBucketLender.depositEth,
      { ...options, from: depositor, value: amount },
      bucketLenderAddress,
      beneficiary,
    );
  }

  public async withdraw(
    bucketLenderAddress: string,
    withdrawer: string,
    buckets: BigNumber[],
    maxWeights: BigNumber[],
    options: ContractCallOptions = {},
  ): Promise<object> {
    return this.contracts.callContractFunction(
      this.contracts.bucketLenderProxy.withdraw,
      { ...options, from: withdrawer },
      bucketLenderAddress,
      buckets,
      maxWeights,
    );
  }

  public async withdrawETHV1(
    bucketLenderAddress: string,
    withdrawer: string,
    buckets: BigNumber[],
    maxWeights: BigNumber[],
    options: ContractCallOptions = {},
  ): Promise<object> {
    return this.contracts.callContractFunction(
      this.contracts.ethWrapperForBucketLender.withdrawEth,
      { ...options, from: withdrawer },
      bucketLenderAddress,
      buckets,
      maxWeights,
    );
  }

  public async withdrawAll(
    bucketLenderAddress: string,
    withdrawer: string,
    options: ContractCallOptions = {},
  ): Promise<object> {
    const buckets: BigNumber[] = await this.getDepositedBuckets(bucketLenderAddress, withdrawer);

    const maxWeights: BigNumber[] = buckets.map(() => BIG_NUMBERS.TWO_TO_255);

    return this.withdraw(
      bucketLenderAddress,
      withdrawer,
      buckets,
      maxWeights,
      options,
    );
  }

  public async withdrawAllETHV1(
    bucketLenderAddress: string,
    withdrawer: string,
    options: ContractCallOptions = {},
  ): Promise<object> {
    const buckets: BigNumber[] = await this.getDepositedBuckets(bucketLenderAddress, withdrawer);

    const maxWeights: BigNumber[] = buckets.map(() => BIG_NUMBERS.TWO_TO_255);

    return this.withdrawETHV1(
      bucketLenderAddress,
      withdrawer,
      buckets,
      maxWeights,
      options,
    );
  }

  public async transferOwnership(
    bucketLenderAddress: string,
    from: string,
    to: string,
    options: ContractCallOptions = {},
  ): Promise<object> {
    const bucketLender: any = await this.getBucketLender(bucketLenderAddress);
    return this.contracts.callContractFunction(
      bucketLender.transferOwnership,
      { ...options, from },
      to,
    );
  }

  // ============ Public Constant Contract Functions ============

  public async getLenderSummary(
    bucketLenderAddress: string,
    lender: string,
    options: LenderSummaryOptions = {},
  ): Promise<BucketLenderSummary> {
    const [
      bucketLender,
      positionId,
      buckets,
      criticalBucket,
      currentBucket,
    ] = await Promise.all([
      this.getBucketLender(bucketLenderAddress),
      this.getBucketLenderPositionId(bucketLenderAddress),
      this.getDepositedBuckets(bucketLenderAddress, lender),
      this.getCriticalBucket(bucketLenderAddress),
      this.getCurrentBucket(bucketLenderAddress),
    ]);

    const [
      positionExists,
      position,
    ] = await Promise.all([
      this.margin.containsPosition(positionId),
      this.margin.getPosition(positionId),
    ]);

    // if position doesn't exist, then all is withdrawable
    if (!positionExists) {
      const [owedTokenWithdrawable] = await bucketLender.withdraw.call(
        buckets,
        buckets.map(() => BIG_NUMBERS.TWO_TO_255), // maxWeights
        lender,
        { from: lender },
      );
      return {
        withdrawable: owedTokenWithdrawable,
        locked: new BigNumber(0),
      };
    }

    const currentTimestamp = options.currentTimestamp || getCurrentEpochSeconds();
    const positionOwedAmount = this.interest.getOwedAmount(
      position.startTimestamp, // startEpoch
      currentTimestamp,
      position.principal,
      position.interestRate,
      position.interestPeriod,
    );

    const results = await Promise.all(
      buckets.map(async (bucket) => {
        let withdrawable = new BigNumber(0);
        let locked = new BigNumber(0);

        // get bucket info
        const [
          bucketAvailable,
          bucketPrincipal,
          bucketWeight,
          accountWeight,
        ] = await Promise.all([
          this.getAvailableForBucket(bucketLenderAddress, bucket),
          this.getPrincipalForBucket(bucketLenderAddress, bucket),
          this.getWeightForBucket(bucketLenderAddress, bucket),
          this.getWeightForBucketForAccount(bucketLenderAddress, bucket, lender),
        ]);

        if (bucketWeight.isZero() || accountWeight.isZero()) {
          return { withdrawable, locked };
        }

        // calculate the amount owed back to the bucket at this point in time
        const principalPlusInterest = this.math.partialAmount(
          positionOwedAmount,
          position.principal,
          bucketPrincipal,
          true,
        );
        const totalBucketOwed = bucketAvailable.plus(principalPlusInterest);

        // calculate the amount owed back to the user at this point in time
        const personalOwed = this.math.partialAmount(
          accountWeight,
          bucketWeight,
          totalBucketOwed,
        );

        // not being lent (or position is not open)
        if (bucket.gt(criticalBucket) || position.startTimestamp.isZero()) {
          withdrawable = personalOwed;

        // being fully lent
        } else if (bucket.lt(criticalBucket)) {
          locked = personalOwed;

        // being partially lent (locked)
        } else if (
          currentBucket !== null
          && currentBucket.eq(criticalBucket)
          && !currentBucket.isZero()
        ) {
          locked = personalOwed;

        // being partially lent (unlocked)
        } else {
          const userWithdrawable =
            bucketAvailable.lt(personalOwed) ? bucketAvailable : personalOwed;
          withdrawable = userWithdrawable;
          locked = personalOwed.minus(userWithdrawable);
        }

        return { withdrawable, locked };
      }),
    );

    let withdrawable = new BigNumber(0);
    let locked = new BigNumber(0);
    results.forEach((result) => {
      withdrawable = withdrawable.plus(result.withdrawable);
      locked = locked.plus(result.locked);
    });

    return { withdrawable, locked };
  }

  public async getTotalPrincipal(
    bucketLenderAddress: string,
  ): Promise<BigNumber> {
    const bucketLender = await this.getBucketLender(bucketLenderAddress);

    return bucketLender.principalTotal.call();
  }

  public async getPrincipalForBucket(
    bucketLenderAddress: string,
    bucketNumber: BigNumber,
  ): Promise<BigNumber> {
    const bucketLender = await this.getBucketLender(bucketLenderAddress);

    return bucketLender.principalForBucket.call(bucketNumber);
  }

  public async getTotalAvailable(
    bucketLenderAddress: string,
  ): Promise<BigNumber> {
    const bucketLender = await this.getBucketLender(bucketLenderAddress);

    return bucketLender.availableTotal.call();
  }

  public async getAvailableForBucket(
    bucketLenderAddress: string,
    bucketNumber: BigNumber,
  ): Promise<BigNumber> {
    const bucketLender = await this.getBucketLender(bucketLenderAddress);

    return bucketLender.availableForBucket.call(bucketNumber);
  }

  public async getCriticalBucket(
    bucketLenderAddress: string,
  ): Promise<BigNumber> {
    const bucketLender = await this.getBucketLender(bucketLenderAddress);

    return bucketLender.criticalBucket.call();
  }

  public async getCurrentBucket(
    bucketLenderAddress: string,
  ): Promise<BigNumber> {
    const bucketLender = await this.getBucketLender(bucketLenderAddress);

    let response;
    try {
      // getCurrentBucket call fails for closed positions
      response = await bucketLender.getCurrentBucket.call();
    } catch (e) {
      // return null for closed positions
      response = null;
    }
    return response;
  }

  public async getWeightForBucket(
    bucketLenderAddress: string,
    bucketNumber: BigNumber,
  ): Promise<BigNumber> {
    const bucketLender = await this.getBucketLender(bucketLenderAddress);

    return bucketLender.weightForBucket.call(bucketNumber);
  }

  public async getWeightForBucketForAccount(
    bucketLenderAddress: string,
    bucketNumber: BigNumber,
    account: string,
  ): Promise<BigNumber> {
    const bucketLender = await this.getBucketLender(bucketLenderAddress);

    return bucketLender.weightForBucketForAccount.call(bucketNumber, account);
  }

  public async getBucketLenderPositionId(
    bucketLenderAddress: string,
  ): Promise<string> {
    const bucketLender = await this.getBucketLender(bucketLenderAddress);

    return bucketLender.POSITION_ID.call();
  }

  public async getBucketTime(
    bucketLenderAddress: string,
  ): Promise<BigNumber> {
    const bucketLender = await this.getBucketLender(bucketLenderAddress);

    return bucketLender.BUCKET_TIME.call();
  }

  public async getInterestRate(
    bucketLenderAddress: string,
  ): Promise<BigNumber> {
    const bucketLender = await this.getBucketLender(bucketLenderAddress);

    const protocolInterestRate = bucketLender.INTEREST_RATE.call();
    return convertInterestRateFromProtocol(protocolInterestRate);
  }

  public async getMaxDuration(
    bucketLenderAddress: string,
  ): Promise<BigNumber> {
    const bucketLender = await this.getBucketLender(bucketLenderAddress);

    return bucketLender.MAX_DURATION.call();
  }

  public async getOwner(
    bucketLenderAddress: string,
  ): Promise<string> {
    const bucketLender = await this.getBucketLender(bucketLenderAddress);

    return bucketLender.owner.call();
  }

  public async getPositionId(
    bucketLenderAddress: string,
  ): Promise<string> {
    const bucketLender = await this.getBucketLender(bucketLenderAddress);

    return bucketLender.POSITION_ID.call();
  }

  // ============ Events ============

  public async getDepositEvents(
    bucketLenderAddress: string,
    beneficiary: string,
    options: object = {},
  ): Promise<Deposit[]> {
    const bucketLender = await this.getBucketLender(bucketLenderAddress);

    const filter = bucketLender.Deposit(
      { beneficiary },
      {
        ...{
          fromBlock: 0,
          toBlock: 'latest',
        },
        ...options,
      },
    );

    bluebird.promisifyAll(filter);

    return filter.getAsync();
  }

  // ============ Private Functions ============

  private getBucketLender(
    bucketLenderAddress: string,
  ): Promise<any> {
    return this.contracts.BucketLender.at(bucketLenderAddress);
  }

  private async getDepositedBuckets(
    bucketLenderAddress: string,
    withdrawer: string,
  ): Promise<BigNumber[]> {
    const bucketLender = await this.getBucketLender(bucketLenderAddress);
    const buckets = Array.from(Array(30).keys()); // [0, ..., 29]
    const weights = await Promise.all(
      buckets.map(bucket => bucketLender.weightForBucketForAccount.call(bucket, withdrawer)),
    );
    const results = [];
    for (let i = 0; i < buckets.length; i += 1) {
      if (!weights[i].isZero()) {
        results.push(new BigNumber(buckets[i]));
      }
    }
    return results;
  }
}
