import React from 'react';
import ReactDOM from 'react-dom';
import delay from 'delay';

import { Random } from 'mockjs';

import TurboScroller from '../../src';

import './index.css';

const PAGE_SIZE = 20;

const viewport = {
  _offsetTop: 0,

  getRect() {
    const windowHeight = Math.ceil(window.document.documentElement.clientHeight);
    return {
      top: this._offsetTop,
      height: Math.max(0, windowHeight - this._offsetTop),
    };
  },

  addScrollListener(callback) {
    window.addEventListener('scroll', callback);

    return () => window.removeEventListener('scroll', callback);
  },
};

class Tweet extends React.Component {
  render() {
    return <div className="tweet">{this.props.tweet}</div>;
  }
}

class TweetList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {};

    this.fetchTweets(0);
  }

  render() {
    if (!this.state.tweetKeys) {
      return <div className="load-tip">正在加载中...</div>;
    }

    return (
      <div className="tweet-list">
        <TurboScroller
          cacheKey="tweet-list"
          viewport={viewport}
          assumedHeight={400}
          list={this.state.tweetKeys}
          renderItem={tweetKey => (
            <Tweet key={tweetKey} tweet={this.state.tweets[tweetKey]}></Tweet>
          )}
          onPositioningUpdate={this.handlePositioningUpdate.bind(this)}
          onHeightsUpdate={() => {}}/>
        <div className="load-tip">正在加载中...</div>
      </div>
    );
  }

  handlePositioningUpdate(positioning) {
    const { sliceEnd } = positioning;

    if (sliceEnd === this.state.tweetKeys.length) {
      this.fetchTweets(this.state.page + 1);
    }
  }

  async fetchTweets(page) {
    if (this.fetchTweetsLock) {
      return;
    }

    this.fetchTweetsLock = true;

    await delay(2e3);

    const tweets = {
      ...(this.state.tweets || {}),
    };
    const tweetKeys = (this.state.tweetKeys || []).concat(Random.range(PAGE_SIZE).map((c, index) => {
      const key = `tweet_${(PAGE_SIZE * page) + index}`;

      tweets[key] = `${Random.cparagraph(20, 40)}`;

      return key;
    }));

    this.setState({
      page,
      tweets,
      tweetKeys,
    });

    this.fetchTweetsLock = false;
  }
}

const mountNode = document.getElementById('demo');
ReactDOM.render(<TweetList />, mountNode);
