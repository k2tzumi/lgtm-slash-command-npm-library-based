import { Slack } from "../src/slack/types/index.d";
import * as fs from "fs";
type Commands = Slack.SlashCommand.Commands;

const properites = {
    getProperty: jest.fn(function () {
        return 'dummy';
    }),
    deleteAllProperties: jest.fn(),
    deleteProperty: jest.fn(),
    getKeys: jest.fn(),
    getProperties: jest.fn(),
    setProperties: jest.fn(),
    setProperty: jest.fn()
};

PropertiesService['getScriptProperties'] = jest.fn(() => properites)
PropertiesService['getUserProperties'] = jest.fn(() => properites)

const mockFetch = jest.fn();
let response: Buffer;

UrlFetchApp.fetch = mockFetch;

const responseMock = {
    getResponseCode: jest.fn(() => {
        return 200;
    }),
    getContent: jest.fn(() => {
        return [...response];
    }),
};
mockFetch.mockReturnValue(responseMock);

Utilities.sleep = jest.fn();

import { executeSlashCommand, createLgtmImage } from "../src/Code";
describe('Code', () => {
    describe('executeSlashCommand', () => {
        it('/', () => {
            const commands: Commands = {} as Commands;

            commands.text = '';
            commands.user_id = 'U2147483697';
            const actual = executeSlashCommand(commands);

            expect(actual).toHaveProperty('response_type', 'ephemeral');
            expect(actual).toHaveProperty('text');
        });
    });
    describe('createLgtmImage', () => {
        it('success', async () => {
            response = fs.readFileSync(__dirname + '/fixtures/image.png');
            fs.writeFileSync('/var/tmp/output.png', await createLgtmImage('https://placehold.jp/150x150.png'));
        });
    });
});
