// @flow

import React from 'react';
import {
  Text,
  View,
  Animated,
} from 'react-native';
import TouchableImage from './TouchableImage'
import styles from '../styles/styles';

export default class FrontCard extends React.Component {
  frontInterpolate: number;

  constructor(props: Object) {
    super(props);
    this.frontInterpolate = props.interpolateCb({
      inputRange: [0, 180],
      outputRange: ['0deg', '180deg'],
    });
  }

  render = () => {
    const frontAnimatedStyle = {
      transform: [
        {rotateY: this.frontInterpolate}
      ]
    };

    const imageStyle = {
      top: 10,
      right: 10,
      width: 100,
      height: 100,
      backgroundColor: 'white',
      shadowColor: 'black',
      shadowOffset: {width: 4, height: 4},
      shadowRadius: 4,
      shadowOpacity: 0.5,
      borderWidth: 1,
      borderRadius: 5
    }

    if (this.props.image && this.props.image.hasAlpha) {
      imageStyle.backgroundColor = 'transparent'
      imageStyle.borderWidth = 0
    }

    return (
      <Animated.View style={[styles.flipCard, frontAnimatedStyle]}>
        <Text style={styles.primaryHeader}>QUESTION:</Text>
        <View style={[styles.flipCardContent, this.props.dynamicStyles.content]}>
          <Text style={styles.primaryText}>{this.props.question}</Text>
          {
            this.props.image &&
            <TouchableImage imageProperties={{
              source: this.props.image.url,
              resizeMode: 'contain',
            }}
                            style={imageStyle}
                            animator={{
                              width: {
                                initial: 100,
                                final: this.props.dynamicStyles.content.width,
                                friction: 7,
                              },
                              height: {
                                initial: 100,
                                final: this.props.dynamicStyles.content.height,
                                friction: 7,
                              },
                              right: {
                                initial: 10,
                                final: 0,
                                friction: 7,
                              },
                              top: {
                                initial: 10,
                                final: 0,
                                friction: 7,
                              },
                              shadowRadius: {
                                initial: 4,
                                final: 10,
                                friction: 7,
                              },
                              shadowOpacity: {
                                initial: 0.5,
                                final: 1,
                                friction: 7,
                              },
                              borderRadius: {
                                initial: 5,
                                final: 0,
                                friction: 7,
                              }
                            }}
            />
          }
        </View>
        <Text style={styles.primaryHeader}>SHOW ANSWER</Text>
      </Animated.View>
    )
  }
}
