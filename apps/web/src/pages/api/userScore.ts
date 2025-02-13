import { NextApiRequest, NextApiResponse } from 'next';
import { UserScore, Tweet } from 'types/Score';
import { config } from '../../config';
import { userTweets } from '../../modules/twitter/twitterFollowersGet';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { body } = req;
  const { providerAccountId, access_token, username } = body;
  const emptyScore: UserScore = {
    retweet_count: 0,
    reply_count: 0,
    like_count: 0,
    quote_count: 0,
    total: 0,
  };

  if (!access_token) {
    return res.status(401).json({
      scoreDetail: emptyScore,
    });
  }

  if (!config.TWITTER_PROFILE_ID || !config.TWITTER_PROFILE_USER) {
    return res.status(500).json({
      scoreDetail: emptyScore,
    });
  }

  const result = await userTweets(
    providerAccountId as string,
    access_token as string,
  );
  if (!result.data) {
    return res.status(204).json({
      scoreDetail: emptyScore,
    });
  }

  const { data } = result;
  const elegibleTweets: Tweet[] = data.filter(
    ({ text, in_reply_to_user_id }: Tweet) => {
      const isReplyingProfileId =
        in_reply_to_user_id === config.TWITTER_PROFILE_ID;
      const isProfileUserMentioned = text.match(
        new RegExp(`cc(:?\\s*)@${config.TWITTER_PROFILE_USER}`, 'gi'),
      );
      const isUserReplied = text.match(
        new RegExp(`@${username} @${config.TWITTER_PROFILE_USER}`, 'gi'),
      );

      return isProfileUserMentioned || isReplyingProfileId || isUserReplied;
    },
  );

  const userScore: UserScore = elegibleTweets.reduce(
    (
      accumulator: UserScore,
      {
        public_metrics: { retweet_count, reply_count, like_count, quote_count },
      }: Tweet,
    ): UserScore => {
      const retweets = retweet_count + accumulator.retweet_count;
      const replies = reply_count + accumulator.reply_count;
      const likes = like_count + accumulator.like_count;
      const quotes = quote_count + accumulator.quote_count;
      const total = retweets + replies + likes + quotes;

      const currentUserScore = {
        retweet_count: retweets,
        reply_count: replies,
        like_count: likes,
        quote_count: quotes,
        total: total,
      };

      return currentUserScore;
    },
    emptyScore,
  );

  return res.status(200).json({
    userScore,
  });
}
