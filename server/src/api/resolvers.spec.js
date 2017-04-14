import mongoose from 'mongoose';
import casual from 'casual';
import _ from 'lodash'

import resolvers from './resolvers'
import {validate} from 'graphql/validation';
import schema from './schema';
import {FlashcardsRepository, Flashcards} from './mongooseSetup';
import {extendExpect, deepFreeze} from 'testHelpers/testHelpers';

extendExpect();
console.log("Gozdecki: process.env.NODE_PATH",process.env.NODE_PATH);
jest.mock('node-fetch', () => {
    return async() => ({
        json: async() => ( {
            data: {
                is_valid: true,
            }
        })
    });
});



async function createFlashcard(props) {
    const newFlashcard = new Flashcards(props);
    await newFlashcard.save();
}

async function createFlashcards(flashcardsData) {
    await Promise.all(flashcardsData.map(createFlashcard));
}

casual.define('flashcard', function() {
    return {
        // _id: mongoose.Types.ObjectId(),
        question: casual.sentence,
        answer: casual.sentence
    };
});



async function makeFlashcards({number = 3, flashcardsToExtend = []} = {}) {
    const addedFlashcards = [];
    // await mongoose.connection.on("open", async() => {


        console.log("Gozdecki: new Date().getTime()",new Date().getTime());
        // console.log("Gozdecki: connection",connection);
        console.log("Gozdecki: new Date().getTime()",new Date().getTime());

        _.times(number, (index) => {

                let newFlashcard = casual.flashcard;
                if (flashcardsToExtend[index]) {
                    newFlashcard = {
                        ...newFlashcard,
                        ...flashcardsToExtend[index]
                    }
                }
                addedFlashcards.push(newFlashcard);
                // await mongoose.connection.db.collection('flashcards').insert(newFlashcard)

            }
        )
        await mongoose.connection.db.collection('flashcards').insert(addedFlashcards)

        console.log("Gozdecki: addedFlashcards",addedFlashcards);

    // });
    console.log("Gozdecki: addedFlashcards",addedFlashcards);
    console.log("Gozdecki: new Date().getTime()",new Date().getTime());

    return addedFlashcards;
}

describe('query.flashcards', () => {

    beforeEach(function(done) {
        mongoose.connection.on("open", done);
    });
    afterEach(async() => {
        await mongoose.connection.db.dropDatabase();
    });
    it('returns flashcards from the db 1', async() => {
        const flashcardsData = await deepFreeze(makeFlashcards());
        // await createFlashcards(flashcardsData);

        const dbFlashcards = await resolvers.Query.Flashcards(undefined, undefined,
            {Flashcards: new FlashcardsRepository()}
        );
        console.log("Gozdecki: flashcarsddsewgaData",flashcardsData);

        console.log("Gozdecki: dbFlashcards",dbFlashcards);
        expect(dbFlashcards.length).toBe(3)
        expect(dbFlashcards).toContainDocuments(flashcardsData);
    })
});

describe('query.flashcard', () => {
        afterEach(async() => {
            await mongoose.connection.db.dropDatabase();
        });
    it('returns a flashcard by id', async() => {

        const flashcardsToExtend = [
            {_id: mongoose.Types.ObjectId()}, {_id: mongoose.Types.ObjectId()}
        ];

        console.log("Gozdecki: flashcardsToExtend",JSON.stringify(flashcardsToExtend));
        const flashcardsData = await makeFlashcards({flashcardsToExtend});

        const dbFlashcards = await resolvers.Query.Flashcard(undefined, {_id: flashcardsToExtend[1]._id},
            {Flashcards: new FlashcardsRepository()}
        );

        console.log("Gozdecki: dbFlashcards", dbFlashcards);
        expect(dbFlashcards._id).toEqual(flashcardsToExtend[1]._id);
    })
})

describe('login with facebook', async() => {
    it('returns user if it already exists', async() => {
        const {logInWithFacebook} = resolvers.Mutation;
        const args = {
            accessToken: 'TOKENsA',
        };

        const user = deepFreeze({username: "test"});

        const context = {
            Users: {
                findByFacebookId: async() => (user),
            },
            req: {
                logIn: jest.fn()
            }
        };

        await logInWithFacebook(undefined, args, context);
        expect(context.req.logIn.mock.calls[0]).toContain(user);
    });
});
// test('user successfully login with facebook', ()=> {
//
// });
