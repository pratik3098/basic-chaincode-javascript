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

    describe('Test EnrollCustomer ', () => {
        it('should return error on EnrollCustomer ', async () => {
            chaincodeStub.putState.rejects('failed inserting key');

            let fareTransfer = new FareTransfer();
            try {
                await fareTransfer.EnrollCustomer (transactionContext, customer.ID, customer.FirstName, customer.LastName, customer.TransitId);
                assert.fail('EnrollCustomer  should have failed');
            } catch(err) {
                expect(err.name).to.equal('failed inserting key');
            }
        });

        it('should return success on EnrollCustomer ', async () => {
            let fareTransfer = new FareTransfer();

            await fareTransfer.EnrollCustomer (transactionContext, customer.ID, customer.FirstName, customer.LastName, customer.TransitId);

            let ret = JSON.parse((await chaincodeStub.getState(customer.ID)).toString());
            expect(ret).to.eql(customer);
        });
    });

    describe('Test GetCustomer', () => {
        it('should return error on GetCustomer', async () => {
            let fareTransfer = new FareTransfer();
            await fareTransfer.EnrollCustomer (transactionContext, customer.ID, customer.FirstName, customer.LastName, customer.TransitId);

            try {
                await fareTransfer.GetCustomer(transactionContext, 'customer2');
                assert.fail('GetCustomer should have failed');
            } catch (err) {
                expect(err.message).to.equal('The customer customer2 does not exist');
            }
        });

        it('should return success on GetCustomer', async () => {
            let fareTransfer = new FareTransfer();
            await fareTransfer.EnrollCustomer (transactionContext, customer.ID, customer.FirstName, customer.LastName, customer.TransitId);

            let ret = JSON.parse(await chaincodeStub.getState(customer.ID));
            expect(ret).to.eql(customer);
        });
    });

    describe('Test UpdatePrimaryTransit', () => {
        // it('should return error on UpdatePrimaryTransit', async () => {
        //     let fareTransfer = new FareTransfer();
        //     await fareTransfer.EnrollCustomer (transactionContext, customer.ID, customer.FirstName, customer.LastName, customer.TransitId);

        //     try {
        //         await fareTransfer.UpdatePrimaryTransit(transactionContext, 'customer2', 'TTC');
        //         assert.fail('UpdatePrimaryTransit should have failed');
        //     } catch (err) {
        //         expect(err.message).to.equal('The customer customer2 does not exist');
        //     }
        // });

        it('should return success on UpdatePrimaryTransit', async () => {
            let fareTransfer = new FareTransfer();
            await fareTransfer.EnrollCustomer (transactionContext, customer.ID, customer.FirstName, customer. LastName, customer.TransitId);

            await fareTransfer.UpdatePrimaryTransit(transactionContext, 'customer1', 'MI');
            let ret = JSON.parse(await chaincodeStub.getState(customer.ID));
            let expected = {
                ID: 'customer1',
                FirstName: 'Brad',
                LastName: 'Pitt',
                TransitId: 'MI'
            };
            expect(ret).to.eql(expected);
        });
    });

    describe('Test DeleteCustomer', () => {
        it('should return error on DeleteCustomer', async () => {
            let fareTransfer = new FareTransfer();
            await fareTransfer.EnrollCustomer (transactionContext, customer.ID, customer.FirstName, customer. LastName, customer.TransitId);

            try {
                await fareTransfer.DeleteCustomer(transactionContext, 'customer2');
                assert.fail('DeleteCustomer should have failed');
            } catch (err) {
                expect(err.message).to.equal('The customer customer2 does not exist');
            }
        });

        it('should return success on DeleteCustomer', async () => {
            let fareTransfer = new FareTransfer();
            await fareTransfer.EnrollCustomer (transactionContext, customer.ID, customer.FirstName, customer. LastName, customer.TransitId);

            await fareTransfer.DeleteCustomer(transactionContext, customer.ID);
            let ret = await chaincodeStub.getState(customer.ID);
            expect(ret).to.equal(undefined);
        });
    });

    // describe('Test TransferAsset', () => {
    //     it('should return error on TransferAsset', async () => {
    //         let fareTransfer = new FareTransfer();
    //         await fareTransfer.EnrollCustomer (transactionContext, customer.ID, customer.FirstName, customer. LastName, customer.TransitId);

    //         try {
    //             await fareTransfer.TransferAsset(transactionContext, 'customer2', 'Me');
    //             assert.fail('DeleteCustomer should have failed');
    //         } catch (err) {
    //             expect(err.message).to.equal('The customer customer2 does not exist');
    //         }
    //     });

    //     it('should return success on TransferAsset', async () => {
    //         let fareTransfer = new FareTransfer();
    //         await fareTransfer.EnrollCustomer (transactionContext, customer.ID, customer.FirstName, customer. LastName, customer.TransitId);

    //         await fareTransfer.TransferAsset(transactionContext, customer.ID, 'Me');
    //         let ret = JSON.parse((await chaincodeStub.getState(customer.ID)).toString());
    //         expect(ret).to.eql(Object.assign({}, customer, {Owner: 'Me'}));
    //     });
    // });

    describe('Test GetAllCustomers', () => {
        it('should return success on GetAllCustomers', async () => {
            let fareTransfer = new FareTransfer();

            await fareTransfer.EnrollCustomer (transactionContext, 'customer1', 'Robert', 'Brown', 'TTC');
            await fareTransfer.EnrollCustomer (transactionContext, 'customer2', 'Paul', 'Reeves', 'MI');
            await fareTransfer.EnrollCustomer (transactionContext, 'customer3', 'Mackenzie', 'Davis', 'BT');
            await fareTransfer.EnrollCustomer (transactionContext, 'customer4', 'Van', 'Louis', 'YRT');

            let ret = await fareTransfer.GetAllCustomers(transactionContext);
            ret = JSON.parse(ret);
            expect(ret.length).to.equal(4);

            let expected = [
                {Record: {ID: 'customer1', FirstName: 'Robert', LastName: 'Brown',  TransferFare: 'TTC'}},
                {Record: {ID: 'customer2', FirstName: 'Paul', LastName: 'Reeves',  TransferFare: 'MI'}},
                {Record: {ID: 'customer3', FirstName: 'Mackenzie', LastName: 'Davis',  TransferFare: 'BT'}},
                {Record: {ID: 'customer4', FirstName: 'Van', LastName: 'Louis',  TransferFare: 'YRT'}}
            ];

            expect(ret).to.eql(expected);
        });

        it('should return success on GetAllCustomers for non JSON value', async () => {
            let fareTransfer = new FareTransfer();

            chaincodeStub.putState.onFirstCall().callsFake((key, value) => {
                if (!chaincodeStub.states) {
                    chaincodeStub.states = {};
                }
                chaincodeStub.states[key] = 'non-json-value';
            });

            await fareTransfer.EnrollCustomer (transactionContext, 'customer1', 'Robert', 'Brown', 'TTC');
            await fareTransfer.EnrollCustomer (transactionContext, 'customer2', 'Paul', 'Reeves', 'MI');
            await fareTransfer.EnrollCustomer (transactionContext, 'customer3', 'Mackenzie', 'Davis', 'BT');
            await fareTransfer.EnrollCustomer (transactionContext, 'customer4', 'Van', 'Louis', 'YRT');

            let ret = await fareTransfer.GetAllCustomers(transactionContext);
            ret = JSON.parse(ret);
            expect(ret.length).to.equal(4);

            let expected = [
                {Record: 'non-json-value'},
                {Record: {ID: 'customer2', FirstName: 'Paul', LastName: 'Reeves', PrimaryTransit: 'MI'}},
                {Record: {ID: 'customer3', FirstName: 'Mackenzie', LastName: 'Davis', PrimaryTransit: 'BT'}},
                {Record: {ID: 'customer4', FirstName: 'Van', LastName: 'Louis', PrimaryTransit: 'YRT'}}
            ];

            expect(ret).to.eql(expected);
        });
    });
});
