// @flow

import mongoose from 'mongoose'
import casual from 'casual'
import _ from 'lodash'
import moment from 'moment'

import resolvers from './resolvers'
import {
  CoursesRepository,
  FlashcardsRepository,
  ItemsRepository,
  ItemsWithFlashcardRepository,
  LessonsRepository,
  UserDetailsRepository,
  UsersRepository
} from './mongooseSetup'
import { deepFreeze, extendExpect } from 'testHelpers/testHelpers'

extendExpect()
jest.mock('node-fetch', () => {
  return async () => ({
    json: async () => ({
      data: {
        is_valid: true
      }
    })
  })
})

beforeAll((done) => {
  mongoose.connection.on('open', done)
})

afterAll(async () => {
  await mongoose.connection.db.dropDatabase()
  await mongoose.disconnect()
})

// async function createFlashcard (props) {
//   const newFlashcard = new Flashcards(props)
//   await newFlashcard.save()
// }

// async function createFlashcards (flashcardsData) {
//   await Promise.all(flashcardsData.map(createFlashcard))
// }

casual.define('flashcard', function () {
  return {
    // _id: mongoose.Types.ObjectId(),
    question: casual.sentence,
    answer: casual.sentence
  }
})

casual.define('item', function () {
  return {
    flashcardId: mongoose.Types.ObjectId(),
    userId: mongoose.Types.ObjectId(),
    actualTimesRepeated: 0,
    easinessFactor: 2.5,
    extraRepeatToday: false,
    lastRepetition: 0,
    nextRepetition: 0,
    previousDaysChange: 0,
    timesRepeated: 0
  }
})

type MakeFlashcardsData = {
  number?: number,
  flashcardsToExtend?: Array<Object>
}

async function makeFlashcards ({ number: number = 3, flashcardsToExtend = [] }: MakeFlashcardsData = {}) {
  const addedFlashcards = []
  _.times(number, (index) => {
      let newFlashcard = casual.flashcard
      if (flashcardsToExtend[index]) {
        newFlashcard = {
          ...newFlashcard,
          ...flashcardsToExtend[index]
        }
      }
      addedFlashcards.push(newFlashcard)
      // await mongoose.connection.db.collection('flashcards').insert(newFlashcard)
    }
  )
  await mongoose.connection.db.collection('flashcards').insert(addedFlashcards)

  return addedFlashcards
}

type MakeItemsData = {
  number?: number,
  itemsToExtend?: Array<Object>
}

async function makeItems ({ number: number = 2, itemsToExtend = [] }: MakeItemsData = {}) {
  const addedItems = []
  _.times(number, (index) => {
    let newFlashcard = casual.item
    if (itemsToExtend[index]) {
      newFlashcard = {
        ...newFlashcard,
        ...itemsToExtend[index]
      }
    }
    addedItems.push(newFlashcard)
  })
  await mongoose.connection.db.collection('items').insert(addedItems)

  return addedItems
}

describe('query.Courses', () => {
  beforeAll(async () => {
    await mongoose.connection.db.collection('courses').insert({ _id: 'testCourseId', name: 'testCourseName' })
    await mongoose.connection.db.collection('courses').insert({ _id: 'testCourse2Id', name: 'testCourseName2' })
  })
  afterAll(async (done) => {
    await mongoose.connection.db.dropDatabase()
    done()
  })
  it('returns all courses', async () => {
    const context = { Courses: new CoursesRepository() }
    const courses = await resolvers.Query.Courses(undefined, undefined, context)

    expect(courses.length).toBe(2)
  })
})

describe('query.Course', () => {
  afterAll(async (done) => {
    await mongoose.connection.db.dropDatabase()
    done()
  })
  it('returns a specific course', async () => {
    await mongoose.connection.db.collection('courses').insert({ name: 'testCourseName' })
    const newCourse = await mongoose.connection.db.collection('courses').insertOne({ name: 'testCourseName2' })
    const newCourseId = newCourse.insertedId

    const context = { Courses: new CoursesRepository() }
    const course = await resolvers.Query.Course(undefined, { _id: newCourseId }, context)

    expect(course.name).toEqual('testCourseName2')
  })
})

describe('query.Lessons', () => {
  beforeAll(async () => {
    await mongoose.connection.db.collection('lessons').insert({ position: 2, courseId: 'testCourseId' })
    await mongoose.connection.db.collection('lessons').insert({ position: 1, courseId: 'testCourseId' })
    await mongoose.connection.db.collection('lessons').insert({ position: 1, courseId: 'testCourse2Id' })
  })
  afterAll(async (done) => {
    await mongoose.connection.db.dropDatabase()
    done()
  })
  it('returns all lessons for a specified course', async () => {
    const context = { Lessons: new LessonsRepository() }
    const lessons = await resolvers.Query.Lessons(undefined, { courseId: 'testCourseId' }, context)

    expect(lessons.length).toBe(2)
  })
  it('returns all lessons for a specified course sorted by its position', async () => {
    const context = { Lessons: new LessonsRepository() }
    const lessons = await resolvers.Query.Lessons(undefined, { courseId: 'testCourseId' }, context)

    expect(lessons[0].position).toBe(1);
  })
})

describe('query.LessonCount', () => {
  beforeAll(async () => {
    await mongoose.connection.db.collection('lessons').insert({ position: 2, courseId: 'testCourseId' })
    await mongoose.connection.db.collection('lessons').insert({ position: 1, courseId: 'testCourseId' })
    await mongoose.connection.db.collection('lessons').insert({ position: 1, courseId: 'testCourse2Id' })
  })
  afterAll(async (done) => {
    await mongoose.connection.db.dropDatabase()
    done()
  })
  it('returns all lessons', async () => {
    const context = { Lessons: new LessonsRepository() }
    const lessonCount = await resolvers.Query.LessonCount(undefined, undefined, context)

    expect(lessonCount).toEqual({ count: 3 })
  })
})

describe('query.flashcards', () => {
  afterEach(async (done) => {
    await mongoose.connection.db.dropDatabase()
    done()
  })
  it('returns flashcards from the db 1', async () => {
    const flashcardsData = await deepFreeze(makeFlashcards())

    const dbFlashcards = await resolvers.Query.Flashcards(undefined, undefined,
      { Flashcards: new FlashcardsRepository() }
    )

    expect(dbFlashcards.length).toBe(3)
    expect(dbFlashcards).toContainDocuments(flashcardsData)
  })
})

describe('query.flashcard', () => {
  afterEach(async (done) => {
    await mongoose.connection.db.dropDatabase()
    done()
  })
  it('returns a flashcard by id', async () => {
    const flashcardsToExtend = [
      { _id: mongoose.Types.ObjectId() }, { _id: mongoose.Types.ObjectId() }
    ]

    const flashcardsData = await makeFlashcards({ flashcardsToExtend })

    const dbFlashcards = await resolvers.Query.Flashcard(undefined, { _id: flashcardsData[1]._id },
      { Flashcards: new FlashcardsRepository() }
    )

    expect(dbFlashcards._id).toEqual(flashcardsData[1]._id)
  })
})

describe('query.Lesson', () => {
  beforeAll(async () => {
    // we have those in different order to make sure the query doesn't return the first inserted lesson.
    await mongoose.connection.db.collection('lessons').insert({ position: 2, courseId: 'testCourseId' })
    await mongoose.connection.db.collection('lessons').insert({ position: 1, courseId: 'testCourseId' })
    await mongoose.connection.db.collection('lessons').insert({ position: 3, courseId: 'testCourseId' })
    await mongoose.connection.db.collection('courses').insert({ _id: 'testCourseId', name: 'testCourseName' })
  })
  afterAll(async (done) => {
    await mongoose.connection.db.dropDatabase()
    done()
  })
  it('returns first lesson for a new user', async () => {
    const userId = mongoose.Types.ObjectId()
    await mongoose.connection.db.collection('userdetails').insert({
      userId,
      progress: [{ courseId: 'testCourseId', lesson: 1 }]
    })

    const context = {
      Lessons: new LessonsRepository(),
      user: { _id: userId },
      UserDetails: new UserDetailsRepository()
    }
    const lesson = await resolvers.Query.Lesson(undefined, { courseId: 'testCourseId' }, context)

    expect(lesson).toEqual(expect.objectContaining({ position: 1 }))
  })
  it('returns third lesson for a logged in user that already watched two lessons', async () => {
    const userId = mongoose.Types.ObjectId()
    await mongoose.connection.db.collection('userdetails').insert({
      userId,
      progress: [{ courseId: 'testCourseId', lesson: 3 }]
    })

    const context = {
      Lessons: new LessonsRepository(),
      user: { _id: userId },
      UserDetails: new UserDetailsRepository()
    }
    const lesson = await resolvers.Query.Lesson(undefined, { courseId: 'testCourseId' }, context)

    expect(lesson).toEqual(expect.objectContaining({ position: 3 }))
  })
})

describe('query.Item', () => {
  afterAll(async (done) => {
    await mongoose.connection.db.dropDatabase()
    done()
  })
  it('returns a specific item', async () => {
    const userId = mongoose.Types.ObjectId()
    await mongoose.connection.db.collection('items').insert({ userId, extraRepeatToday: true })
    const newItem = await mongoose.connection.db.collection('items').insertOne({ userId, extraRepeatToday: false })
    const newItemId = newItem.insertedId
    const context = { Items: new ItemsRepository(), user: { _id: userId } }

    const course = await resolvers.Query.Item(undefined, { _id: newItemId }, context)

    expect(course.extraRepeatToday).toEqual(false)
  })
})

describe('query.ItemsWithFlashcard', () => {
  afterAll(async (done) => {
    await mongoose.connection.db.dropDatabase()
    done()
  })

  it('returns 0 items if no user exists', async () => {
    const context = { ItemsWithFlashcard: new ItemsWithFlashcardRepository() }

    const items = await resolvers.Query.ItemsWithFlashcard(undefined, undefined, context)

    expect(items.length).toBe(0)
  })

  it('returns 0 items for a new user without any lessons watched', async () => {
    const userId = mongoose.Types.ObjectId()
    const context = { user: { _id: userId }, ItemsWithFlashcard: new ItemsWithFlashcardRepository() }

    const items = await resolvers.Query.ItemsWithFlashcard(undefined, undefined, context)

    expect(items.length).toBe(0)
  })

  it('returns all available items for a new user after watching the first lesson', async () => {
    const userId = mongoose.Types.ObjectId()
    const flashcard = await mongoose.connection.db.collection('flashcards').insert({ question: '?', answer: '!' })
    const flashcardId = flashcard.insertedIds[0].toString()

    const context = { user: { _id: userId }, ItemsWithFlashcard: new ItemsWithFlashcardRepository() }
    const itemsToExtend = [
      { userId, flashcardId }, { userId }
    ]
    await makeItems({ itemsToExtend })

    const items = await resolvers.Query.ItemsWithFlashcard(undefined, undefined, context)

    expect(items.length).toBe(itemsToExtend.length)
  })
})

describe('query.SessionCount', () => {
  afterAll(async (done) => {
    await mongoose.connection.db.dropDatabase()
    done()
  })
  it('returns an empty object if no user exists', async () => {
    const context = { ItemsWithFlashcard: new ItemsWithFlashcardRepository() }

    const sessionCount = await resolvers.Query.SessionCount(undefined, undefined, context)

    expect(sessionCount).toEqual({})
  })
  it('returns a session count', async () => {
    const userId = mongoose.Types.ObjectId()
    await mongoose.connection.db.collection('items').insertOne({ userId, actualTimesRepeated: 0 })
    const context = { user: { _id: userId }, ItemsWithFlashcard: new ItemsWithFlashcardRepository() }

    const sessionCount = await resolvers.Query.SessionCount(undefined, undefined, context)

    expect(sessionCount).toEqual(expect.objectContaining({
      newDone: 0,
      newTotal: 1,
      dueDone: 0,
      dueTotal: 0,
      reviewDone: 0,
      reviewTotal: 0
    }))
  })
})

describe('query.CurrentUser', () => {
  it('returns unchanged user from a context', () => {
    const context = deepFreeze({
      user: { _id: 'testId', email: 'test@email.com' }
    })

    const currentUser = resolvers.Query.CurrentUser(undefined, undefined, context)
    expect(currentUser).toEqual(context.user)
  })
})

describe('query.UserDetails', () => {
  it('returns an empty object if no user exists', async () => {
    const context = {
      user: {},
      UserDetails: new UserDetailsRepository()
    }

    const userDetails = resolvers.Query.UserDetails(undefined, undefined, context)

    expect(userDetails).toEqual(Promise.resolve({}))
  })
  it('returns user details by user id', async () => {
    const userId = mongoose.Types.ObjectId()
    await mongoose.connection.db.collection('userdetails').insert({
      userId,
      progress: [{ courseId: 'testCourseId', lesson: 1 }]
    })

    const context = {
      user: { _id: userId },
      UserDetails: new UserDetailsRepository()
    }

    const userDetails = await resolvers.Query.UserDetails(undefined, undefined, context)

    expect(userDetails.progress[0].lesson).toEqual(1)
  })
})

describe('mutation.selectCourse', () => {
  let context
  beforeAll(async () => {
    await mongoose.connection.db.collection('courses').insert({ _id: 'testCourseId' })

    context = {
      user: {},
      Users: new UsersRepository(),
      UserDetails: new UserDetailsRepository(),
      req: {
        logIn: jest.fn()
      }
    }
  })
  afterAll(async (done) => {
    await mongoose.connection.db.dropDatabase()
    done()
  })
  it('saves info about a course selected if no user exists', async () => {
    const result = await resolvers.Mutation.selectCourse(undefined, { courseId: 'testCourseId' }, context)

    expect(result.success).toBe(true)
  })
  it('saves info about a course selected by a user', async () => {
    const userId = mongoose.Types.ObjectId()
    await mongoose.connection.db.collection('userdetails').insert({
      userId,
      progress: [{ courseId: 'testCourseId', lesson: 1 }]
    })
    context.user = { _id: userId }

    const result = await resolvers.Mutation.selectCourse(undefined, { courseId: 'testCourseId' }, context)

    expect(result.success).toBe(true)
  })
})

describe('mutation.createItemsAndMarkLessonAsWatched', () => {
  let context
  beforeAll(async () => {
    // we have those in different order to make sure the query doesn't return the first inserted lesson.
    await mongoose.connection.db.collection('lessons').insert({ position: 2, courseId: 'testCourseId' })
    await mongoose.connection.db.collection('lessons').insert({ position: 1, courseId: 'testCourseId' })
    await mongoose.connection.db.collection('courses').insert({ _id: 'testCourseId' })

    context = {
      user: {},
      Users: new UsersRepository(),
      UserDetails: new UserDetailsRepository(),
      Lessons: new LessonsRepository(),
      Items: new ItemsRepository(),
      req: {
        logIn: jest.fn()
      }
    }
  })
  afterAll(async (done) => {
    await mongoose.connection.db.dropDatabase()
    done()
  })
  it('returns the second lesson after watching the first one if you are a logged in user', async () => {
    const userId = mongoose.Types.ObjectId()
    await mongoose.connection.db.collection('userdetails').insert({
      userId,
      progress: [{ courseId: 'testCourseId', lesson: 1 }]
    })
    context.user = { _id: userId }

    const lesson = await resolvers.Mutation.createItemsAndMarkLessonAsWatched(undefined, { courseId: 'testCourseId' }, context)

    expect(lesson.position).toBe(2)
  })
})

describe('mutation.hideTutorial', () => {
  let context
  beforeAll(async () => {
    context = {
      user: {},
      Users: new UsersRepository(),
      UserDetails: new UserDetailsRepository(),
      req: {
        logIn: jest.fn()
      }
    }
  })
  afterAll(async (done) => {
    await mongoose.connection.db.dropDatabase()
    done()
  })
  it('saves info that a tutorial should be disabled for a specific user', async () => {
    const userId = mongoose.Types.ObjectId()
    await mongoose.connection.db.collection('userdetails').insert({
      userId,
      progress: [{ courseId: 'testCourseId', lesson: 1 }]
    })
    context.user = { _id: userId }

    const user = await resolvers.Mutation.hideTutorial(undefined, { courseId: 'testCourseId' }, context)

    expect(user.hasDisabledTutorial).toBe(true)
  })
})

describe('mutation.processEvaluation', () => {
  let context
  beforeAll(async () => {
    context = {
      user: { _id: mongoose.Types.ObjectId() },
      Items: new ItemsRepository(),
      ItemsWithFlashcard: new ItemsWithFlashcardRepository()
    }
  })

  afterAll(async (done) => {
    await mongoose.connection.db.dropDatabase()
    done()
  })

  it('returns a correct item after "Wrong" evaluation', async () => {
    const userId = context.user._id
    const itemsToExtend = [
      { userId, _id: mongoose.Types.ObjectId() },
      { userId, _id: mongoose.Types.ObjectId() }
    ]

    await makeItems({ itemsToExtend })

    const args = {
      itemId: itemsToExtend[1]._id,
      evaluation: 2.5
    }

    context.UserDetails = new UserDetailsRepository()
    const itemsWithFlashcard = await resolvers.Mutation.processEvaluation(undefined, args, context)
    const itemWithFlashcard = _.find(itemsWithFlashcard, (doc) => _.isEqual(doc.item._id, args.itemId))

    expect(itemWithFlashcard.item.actualTimesRepeated).toEqual(1)
  })
})

describe('login with facebook', async () => {
  it('returns user if it already exists', async () => {
    const { logInWithFacebook } = resolvers.Mutation
    const args = {
      accessToken: 'TOKEN'
    }

    const user = deepFreeze({ username: 'test' })

    const context = {
      Users: {
        findByFacebookId: async () => (user)
      },
      req: {
        logIn: jest.fn()
      }
    }

    await logInWithFacebook(undefined, args, context)
    expect(context.req.logIn.mock.calls[0]).toContain(user)
  })
})

describe('query.Reviews', () => {
  afterAll(async (done) => {
    await mongoose.connection.db.dropDatabase()
    done()
  })

  it('returns empty list by default', async () => {
    const userId = mongoose.Types.ObjectId()
    const context = { user: { _id: userId }, Items: new ItemsRepository() }

    const reviews = await resolvers.Query.Reviews(undefined, undefined, context)

    expect(reviews.length).toBe(0)
  })

  it('returns list of reviews grouped by day timestamp', async () => {
    const userId = mongoose.Types.ObjectId()
    const context = { user: { _id: userId }, Items: new ItemsRepository() }
    const tomorrowDate = moment().add(1, 'day')
    const dayAfterTomorrowDate = moment().add(2, 'day')
    const itemsToExtend = [
      { userId, nextRepetition: tomorrowDate.unix() }, { userId, nextRepetition: dayAfterTomorrowDate.unix() },
      { userId, nextRepetition: dayAfterTomorrowDate.add(1, 'hour').unix() }
    ]
    await makeItems({ itemsToExtend, number: itemsToExtend.length })

    const reviews = await resolvers.Query.Reviews(undefined, undefined, context)

    expect(reviews).toEqual([
      { ts: tomorrowDate.clone().utc().startOf('day').unix(), count: 1 },
      { ts: dayAfterTomorrowDate.clone().utc().startOf('day').unix(), count: 2 }
    ])
  })
})
