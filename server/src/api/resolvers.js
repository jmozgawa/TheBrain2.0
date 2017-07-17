// @flow

import fetch from 'node-fetch'
import returnItemAfterEvaluation from './tools/returnItemAfterEvaluation'
import facebookIds from '../configuration/facebook'
import { UsersRepository } from './repositories/UsersRepository'
// import { sendMail } from './tools/emailService'

const resolvers = {
  Query: {
    async Achievements (root: ?string, args: ?Object, context: Object) {
      let userId = context.user && context.user._id
      if (!userId) {
        throw Error(`Invalid userId: ${userId}`)
      }
      const userDetails = await context.UserDetails.getById(userId)

      if (!userDetails) {
        throw Error(`Cannot fetch userDetials for userId: ${userId}`)
      }

      const userAchievements = await context.Achievements.getUserAchievements(userDetails)

      const collectedAchievementIds = userAchievements.filter(achievement => achievement.isCollected).map(achievement => achievement._id)
      await context.UserDetails.updateCollectedAchievements(userId, collectedAchievementIds)

      return userAchievements
    },
    Courses (root: ?string, args: ?Object, context: Object) {
      return context.Courses.getCourses()
    },
    Course (root: ?string, args: { _id: string }, context: Object) {
      return context.Courses.getCourse(args._id)
    },
    Flashcards (root: ?string, args: ?Object, context: Object) {
      return context.Flashcards.getFlashcards()
    },
    Flashcard (root: ?string, args: { _id: string }, context: Object) {
      return context.Flashcards.getFlashcard(args._id)
    },
    async Lesson (root: ?string, args: { courseId: string }, context: Object) {
      const lessonPosition = await context.UserDetails.getNextLessonPosition(args.courseId, context.user._id)

      return context.Lessons.getCourseLessonByPosition(args.courseId, lessonPosition)
    },
    Lessons (root: ?string, args: { courseId: string }, context: Object) {
      return context.Lessons.getLessons(args.courseId)
    },
    LessonCount (root: ?string, args: ?Object, context: Object) {
      return context.Lessons.getLessonCount()
    },
    Item (root: ?string, args: { _id: string }, context: Object) {
      return context.Items.getItemById(args._id, context.user._id)
    },
    ItemsWithFlashcard (root: ?string, args: ?Object, context: Object) {
      if (context.user) {
        return context.ItemsWithFlashcard.getItemsWithFlashcard(context.user._id)
      } else {
        return []
      }
    },
    SessionCount (root: ?string, args: ?Object, context: Object) {
      if (context.user) {
        return context.ItemsWithFlashcard.getSessionCount(context.user._id)
      } else {
        return {}
      }
    },
    CurrentUser (root: ?string, args: ?Object, context: Object) {
      return context.user
    },
    async UserDetails (root: ?string, args: ?Object, context: Object) {
      let userId = context.user && context.user._id
      if (!userId) {
        return {}
      }
      return context.UserDetails.getById(context.user._id)
    }
  },
  Mutation: {
    async selectCourse (root: ?string, args: { courseId: string }, context: Object) {
      let userId = context.user && context.user._id
      if (!userId) {
        const guestUser = await context.Users.createGuest(args.courseId)
        console.log('Gozdecki: guestUser', guestUser)
        userId = guestUser._id
        context.req.logIn(guestUser, (err) => { if (err) throw err })
      }
      return context.UserDetails.selectCourse(userId, args.courseId)
    },
    async closeCourse (root: ?string, args: ?Object, context: Object) {
      let userId = context.user && context.user._id
      if (!userId) {
        console.log('Gozdecki: guestUser')
      }
      return context.UserDetails.closeCourse(userId)
    },
    async createItemsAndMarkLessonAsWatched (root: ?string, args: { courseId: string }, context: Object) {
      let userId = context.user && context.user._id
      if (!userId) {
        console.log('Gozdecki: guestUser')
      }
      const currentLessonPosition = await context.UserDetails.getNextLessonPosition(args.courseId, userId)
      console.log('JMOZGAWA: currentLessonPosition', currentLessonPosition)
      const lesson = await context.Lessons.getCourseLessonByPosition(args.courseId, currentLessonPosition)
      if (!lesson) {
        return {}
      }
      console.log('JMOZGAWA: lesson', lesson)
      const flashcardIds = lesson.flashcardIds
      // TODO THIS SPLICE HAS TO GO
      flashcardIds.splice(1)
      flashcardIds.forEach((flashcardId) => {
        context.Items.create(flashcardId, userId)
      })
      await context.UserDetails.updateNextLessonPosition(args.courseId, userId)
      const nextLessonPosition = await context.UserDetails.getNextLessonPosition(args.courseId, userId)
      return context.Lessons.getCourseLessonByPosition(args.courseId, nextLessonPosition)
    },
    async logInWithFacebook (root: ?string, args: { accessToken: string }, context: Object) {
      const {accessToken: userToken} = args
      const requestUrl = `https://graph.facebook.com/debug_token?input_token=${userToken}&access_token=${facebookIds.appToken}`

      const res = await fetch(requestUrl)
      const parsedResponse = await res.json()
      if (parsedResponse.data.is_valid) {
        const facebookId = parsedResponse.data.user_id
        const user = await context.Users.findByFacebookId(facebookId)

        if (user) {
          context.req.logIn(user, (err) => { if (err) throw err })
          return user
        }
        const newUser = await context.Users.updateFacebookUser(context.user._id, facebookId)
        return newUser
      } else {
        return null
      }
    },
    async logIn (root: ?string, args: { username: string, password: string }, context: Object) {
      try {
        const user = await context.Users.findByUsername(args.username)

        if (!user) {
          throw new Error('User not found')
        }

        const isMatch = await UsersRepository.comparePassword(user.password, args.password)
        if (isMatch) {
          context.req.logIn(user, (err) => { if (err) throw err })
          return user
        }
        throw new Error('Wrong username or password')
      } catch (e) {
        throw e
      }
    },
    async logOut (root: ?string, args: ?Object, context: Object) {
      if (context.user) {
        context.req.logOut()
      }
      return {_id: 'loggedOut', username: 'loggedOut', activated: false}
    },
    async hideTutorial (root: ?string, args: ?Object, context: Object) {
      return context.UserDetails.disableTutorial(context.user._id)
    },
    async setUsernameAndPasswordForGuest (root: ?string, args: { username: string, password: string }, context: Object) {
      try {
        const username = args.username.trim()
        if (!username || !args.password) {
          throw new Error('Username and password cannot be empty')
        }

        const user = await context.Users.findByUsername(username)

        if (user) {
          throw new Error('Username is already taken')
        }

        await context.Users.updateUser(context.user._id, username, args.password)

        return resolvers.Mutation.logIn(root, {username, password: args.password}, context)
      } catch (e) {
        throw e
      }
    },
    async processEvaluation (root: ?string, args: { itemId: string, evaluation: number }, context: Object) {
      await context.UserDetails.updateUserXp(context.user._id, 'processEvaluation')

      const item = await context.Items.getItemById(args.itemId, context.user._id)
      const newItem = returnItemAfterEvaluation(args.evaluation, item)
      // TODO move this to repository
      await context.Items.update(args.itemId, newItem, context.user._id)

      return context.ItemsWithFlashcard.getItemsWithFlashcard(context.user._id)
    },
    async resetPassword (root: ?string, args: { username: string }, context: Object) {
      const updatedUser = await context.Users.resetUserPassword(args.username)
      if (updatedUser) {
        // TODO check after domain successfully verified, send email with reset link
        // sendMail({
        //     from: 'thebrain.pro',
        //     to: 'jmozgawa@thebrain.pro',
        //     subject: 'logInWithFacebook',
        //     text: 'THIS IS TEST MESSAGE'
        // });
        return {success: true}
      } else {
        return {success: false}
      }
    }
  }
}
//
process.on('unhandledRejection', (reason) => {
  // console.log('Reason: ' + reason)
  throw (reason)
})

export default resolvers
