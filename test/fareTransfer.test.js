/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
*/

'use strict';
const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;

const { Context } = require('fabric-contract-api');
const { ChaincodeStub } = require('fabric-shim');

const FareTransfer = require('../lib/fareTransfer.js');

let assert = sinon.assert;
chai.use(sinonChai);

describe('Fare Transfer Basic Tests', () => {
    let transactionContext, chaincodeStub, customer;
    beforeEach(() => {
        transactionContext = new Context();

        chaincodeStub = sinon.createStubInstance(ChaincodeStub);
        transactionContext.setChaincodeStub(chaincodeStub);

        chaincodeStub.putState.callsFake((key, value) => {
            if (!chaincodeStub.states) {
                chaincodeStub.states = {};
            }
            chaincodeStub.states[key] = value;
        });

        chaincodeStub.getState.callsFake(async (key) => {
            let ret;
            if (chaincodeStub.states) {
                ret = chaincodeStub.states[key];
            }
            return Promise.resolve(ret);
        });

        chaincodeStub.deleteState.callsFake(async (key) => {
            if (chaincodeStub.states) {
                delete chaincodeStub.states[key];
            }
            return Promise.resolve(key);
        });

        chaincodeStub.getStateByRange.callsFake(async () => {
            function* internalGetStateByRange() {
                if (chaincodeStub.states) {
                    // Shallow copy
                    const copied = Object.assign({}, chaincodeStub.states);

                    for (let key in copied) {
                        yield {value: copied[key]};
                    }
                }
            }

            return Promise.resolve(internalGetStateByRange());
        });

        customer={
            ID: 'customer1',
            FirstName: 'Brad',
            LastName: 'Pitt',
            TransitId: 'TTC',
        };
    });

    describe('Test InitLedger', () => {
        it('should return error on InitLedger', async () => {
            chaincodeStub.putState.rejects('failed inserting key');
            let fareTransfer = new FareTransfer();
            try {
                await fareTransfer.InitLedger(transactionContext);
                assert.fail('InitLedger should have failed');
            } catch (err) {
                expect(err.name).to.equal('failed inserting key');
            }
        });

        it('should return success on InitLedger', async () => {
            let fareTransfer = new FareTransfer();
            await fareTransfer.InitLedger(transactionContext);
            let ret = JSON.parse((await chaincodeStub.getState('customer1')).toString());
            expect(ret).to.eql(Object.assign({docType: 'customer'}, customer));
        });
    });

    describe('Test CreateAsset', () => {
        it('should return error on CreateAsset', async () => {
            chaincodeStub.putState.rejects('failed inserting key');

            let fareTransfer = new FareTransfer();
            try {
                await fareTransfer.CreateAsset(transactionContext, customer.ID, customer.Color, customer.Size, customer.Owner, customer.AppraisedValue);
                assert.fail('CreateAsset should have failed');
            } catch(err) {
                expect(err.name).to.equal('failed inserting key');
            }
        });

        it('should return success on CreateAsset', async () => {
            let fareTransfer = new FareTransfer();

            await fareTransfer.CreateAsset(transactionContext, customer.ID, customer.Color, customer.Size, customer.Owner, customer.AppraisedValue);

            let ret = JSON.parse((await chaincodeStub.getState(customer.ID)).toString());
            expect(ret).to.eql(customer);
        });
    });

    describe('Test ReadAsset', () => {
        it('should return error on ReadAsset', async () => {
            let fareTransfer = new FareTransfer();
            await fareTransfer.CreateAsset(transactionContext, customer.ID, customer.Color, customer.Size, customer.Owner, customer.AppraisedValue);

            try {
                await fareTransfer.ReadAsset(transactionContext, 'customer2');
                assert.fail('ReadAsset should have failed');
            } catch (err) {
                expect(err.message).to.equal('The customer customer2 does not exist');
            }
        });

        it('should return success on ReadAsset', async () => {
            let fareTransfer = new FareTransfer();
            await fareTransfer.CreateAsset(transactionContext, customer.ID, customer.Color, customer.Size, customer.Owner, customer.AppraisedValue);

            let ret = JSON.parse(await chaincodeStub.getState(customer.ID));
            expect(ret).to.eql(customer);
        });
    });

    describe('Test UpdateAsset', () => {
        it('should return error on UpdateAsset', async () => {
            let fareTransfer = new FareTransfer();
            await fareTransfer.CreateAsset(transactionContext, customer.ID, customer.Color, customer.Size, customer.Owner, customer.AppraisedValue);

            try {
                await fareTransfer.UpdateAsset(transactionContext, 'customer2', 'orange', 10, 'Me', 500);
                assert.fail('UpdateAsset should have failed');
            } catch (err) {
                expect(err.message).to.equal('The customer customer2 does not exist');
            }
        });

        it('should return success on UpdateAsset', async () => {
            let fareTransfer = new FareTransfer();
            await fareTransfer.CreateAsset(transactionContext, customer.ID, customer.Color, customer.Size, customer.Owner, customer.AppraisedValue);

            await fareTransfer.UpdateAsset(transactionContext, 'customer1', 'orange', 10, 'Me', 500);
            let ret = JSON.parse(await chaincodeStub.getState(customer.ID));
            let expected = {
                ID: 'customer1',
                Color: 'orange',
                Size: 10,
                Owner: 'Me',
                AppraisedValue: 500
            };
            expect(ret).to.eql(expected);
        });
    });

    describe('Test DeleteAsset', () => {
        it('should return error on DeleteAsset', async () => {
            let fareTransfer = new FareTransfer();
            await fareTransfer.CreateAsset(transactionContext, customer.ID, customer.Color, customer.Size, customer.Owner, customer.AppraisedValue);

            try {
                await fareTransfer.DeleteAsset(transactionContext, 'customer2');
                assert.fail('DeleteAsset should have failed');
            } catch (err) {
                expect(err.message).to.equal('The customer customer2 does not exist');
            }
        });

        it('should return success on DeleteAsset', async () => {
            let fareTransfer = new FareTransfer();
            await fareTransfer.CreateAsset(transactionContext, customer.ID, customer.Color, customer.Size, customer.Owner, customer.AppraisedValue);

            await fareTransfer.DeleteAsset(transactionContext, customer.ID);
            let ret = await chaincodeStub.getState(customer.ID);
            expect(ret).to.equal(undefined);
        });
    });

    describe('Test TransferAsset', () => {
        it('should return error on TransferAsset', async () => {
            let fareTransfer = new FareTransfer();
            await fareTransfer.CreateAsset(transactionContext, customer.ID, customer.Color, customer.Size, customer.Owner, customer.AppraisedValue);

            try {
                await fareTransfer.TransferAsset(transactionContext, 'customer2', 'Me');
                assert.fail('DeleteAsset should have failed');
            } catch (err) {
                expect(err.message).to.equal('The customer customer2 does not exist');
            }
        });

        it('should return success on TransferAsset', async () => {
            let fareTransfer = new FareTransfer();
            await fareTransfer.CreateAsset(transactionContext, customer.ID, customer.Color, customer.Size, customer.Owner, customer.AppraisedValue);

            await fareTransfer.TransferAsset(transactionContext, customer.ID, 'Me');
            let ret = JSON.parse((await chaincodeStub.getState(customer.ID)).toString());
            expect(ret).to.eql(Object.assign({}, customer, {Owner: 'Me'}));
        });
    });

    describe('Test GetAllAssets', () => {
        it('should return success on GetAllAssets', async () => {
            let fareTransfer = new FareTransfer();

            await fareTransfer.CreateAsset(transactionContext, 'customer1', 'blue', 5, 'Robert', 100);
            await fareTransfer.CreateAsset(transactionContext, 'customer2', 'orange', 10, 'Paul', 200);
            await fareTransfer.CreateAsset(transactionContext, 'customer3', 'red', 15, 'Troy', 300);
            await fareTransfer.CreateAsset(transactionContext, 'customer4', 'pink', 20, 'Van', 400);

            let ret = await fareTransfer.GetAllAssets(transactionContext);
            ret = JSON.parse(ret);
            expect(ret.length).to.equal(4);

            let expected = [
                {Record: {ID: 'customer1', Color: 'blue', Size: 5, Owner: 'Robert', AppraisedValue: 100}},
                {Record: {ID: 'customer2', Color: 'orange', Size: 10, Owner: 'Paul', AppraisedValue: 200}},
                {Record: {ID: 'customer3', Color: 'red', Size: 15, Owner: 'Troy', AppraisedValue: 300}},
                {Record: {ID: 'customer4', Color: 'pink', Size: 20, Owner: 'Van', AppraisedValue: 400}}
            ];

            expect(ret).to.eql(expected);
        });

        it('should return success on GetAllAssets for non JSON value', async () => {
            let fareTransfer = new FareTransfer();

            chaincodeStub.putState.onFirstCall().callsFake((key, value) => {
                if (!chaincodeStub.states) {
                    chaincodeStub.states = {};
                }
                chaincodeStub.states[key] = 'non-json-value';
            });

            await fareTransfer.CreateAsset(transactionContext, 'customer1', 'blue', 5, 'Robert', 100);
            await fareTransfer.CreateAsset(transactionContext, 'customer2', 'orange', 10, 'Paul', 200);
            await fareTransfer.CreateAsset(transactionContext, 'customer3', 'red', 15, 'Troy', 300);
            await fareTransfer.CreateAsset(transactionContext, 'customer4', 'pink', 20, 'Van', 400);

            let ret = await fareTransfer.GetAllAssets(transactionContext);
            ret = JSON.parse(ret);
            expect(ret.length).to.equal(4);

            let expected = [
                {Record: 'non-json-value'},
                {Record: {ID: 'customer2', Color: 'orange', Size: 10, Owner: 'Paul', AppraisedValue: 200}},
                {Record: {ID: 'customer3', Color: 'red', Size: 15, Owner: 'Troy', AppraisedValue: 300}},
                {Record: {ID: 'customer4', Color: 'pink', Size: 20, Owner: 'Van', AppraisedValue: 400}}
            ];

            expect(ret).to.eql(expected);
        });
    });
});
