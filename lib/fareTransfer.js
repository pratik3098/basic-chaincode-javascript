/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

// Deterministic JSON.stringify()
const stringify  = require('json-stringify-deterministic');
const sortKeysRecursive  = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');
const utils=require("./utils.js")

class FareTransfer extends Contract {

    async InitLedger(ctx) {
        const assets = [
            {
                ID: 'asset1',
                Color: 'blue',
                Size: 5,
                Owner: 'Tomoko',
                AppraisedValue: 300,
            },
            {
                ID: 'asset2',
                Color: 'red',
                Size: 5,
                Owner: 'Brad',
                AppraisedValue: 400,
            },
            {
                ID: 'asset3',
                Color: 'green',
                Size: 10,
                Owner: 'Jin Soo',
                AppraisedValue: 500,
            },
            {
                ID: 'asset4',
                Color: 'yellow',
                Size: 10,
                Owner: 'Max',
                AppraisedValue: 600,
            },
            {
                ID: 'asset5',
                Color: 'black',
                Size: 15,
                Owner: 'Adriana',
                AppraisedValue: 700,
            },
            {
                ID: 'asset6',
                Color: 'white',
                Size: 15,
                Owner: 'Michel',
                AppraisedValue: 800,
            },
        ];

        for (const asset of assets) {
            asset.docType = 'asset';
            // example of how to write to world state deterministically
            // use convetion of alphabetic order
            // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
            // when retrieving data, in any lang, the order of data will be the same and consequently also the corresonding hash
            await ctx.stub.putState(asset.ID, Buffer.from(stringify(sortKeysRecursive(asset))));
        }
    }

    // EnrollCustomer adds a new customer to the transit system.
    async EnrollCustomer(ctx, id, firstName, lastName, primaryTransit){
        const exists = await this.CustomerExists(ctx, id);
        if (exists) {
            throw new Error(`The customer ${id} already exists`);
        }
        
        const validTransit = utils.isValidTransit(primaryTransit)
        if (!validTransit) {
            throw new Error(`The transit Id ${primaryTransit} is invalid`);
        }


        const customer = {
            ID: id,
            FirstName: firstName,
            LastName: lastName,
            TransitId: primaryTransit,
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(customer))));
        return JSON.stringify(customer);

    }




    // GetCustomer returns the customer info stored in the world state with given id.
    async GetCustomer(ctx, id) {
        const customerJSON = await ctx.stub.getState(id); // get the customer from chaincode state
        if (!customerJSON || customerJSON.length === 0) {
            throw new Error(`The customer ${id} does not exist`);
        }
        return customerJSON.toString();
    }

    // UpdatePrimaryTransit updates an existing customer primaryId.
    async UpdatePrimaryTransit(ctx, id, newTransitId) {

        const validTransit=utils.isValidTransit(newTransitId)
        if (!validTransit) {
            throw new Error(`Invalid transit ${newTransitId}`);
        }

        try{
        let customer = await this.GetCustomer(ctx, id)

        // overwriting the customer primary transit
        customer.ID=newTransitId

                // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        return ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(customer))));
        
        }catch(err){
            return err
        }
      


    }

    // DeleteAsset deletes an given asset from the world state.
    async DeleteCustomer(ctx, id) {
        const exists = await this.CustomerExists(ctx, id);
        if (!exists) {
            throw new Error(`The customer ${id} does not exist`);
        }
        return ctx.stub.deleteState(id);
    }

    // CustomerExists returns true when asset with given ID exists in world state.
    async CustomerExists(ctx, id) {
        const customerJSON = await ctx.stub.getState(id);
        return customerJSON && customerJSON.length > 0;
    }

    // TransferAsset updates the owner field of asset with given id in the world state.
    async TransferAsset(ctx, id, newOwner) {
        const assetString = await this.GetCustomer(ctx, id);
        const asset = JSON.parse(assetString);
        const oldOwner = asset.Owner;
        asset.Owner = newOwner;
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        return oldOwner;
    }

    // GetAllCustomers returns all customers found in the world state.
    async GetAllCustomers(ctx) {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all customers in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }
}

module.exports = FareTransfer;
