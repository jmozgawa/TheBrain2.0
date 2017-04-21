import React from 'react';
import {connect} from 'react-redux';
import {graphql} from 'react-apollo';
import gql from 'graphql-tag';
import update from 'immutability-helper';
import FrontCard from './FrontCard';
import BackCard from './BackCard';
import { calculateSwipeDirection, calculateDragLength } from '../helpers/SwipeHelpers';
import {
    TouchableOpacity,
    Animated,
    View,
    Text,
    Dimensions,
} from 'react-native';
import Emoji from 'react-native-emoji';
import styles from '../styles/styles';
import { updateAnswerVisibility } from '../actions/FlashcardActions';

const DIRECTION = {
  1: 'left',
  2: 'up',
  3: 'right',
  4: 'down',
};

class Flashcard extends React.Component {

    constructor(props) {
        super(props);
        this.toAnswerSide = 180;
        this.toQuestionSide = 0;
        const windowDimensions = Dimensions.get('window');
        this.windowWidth = windowDimensions.width;
        this.windowHeight = windowDimensions.height;
    }

    interpolateWrapper = ({ inputRange, outputRange }) => {
      return this.animatedValue.interpolate({
        inputRange,
        outputRange,
      });
    };

    componentWillMount = () => {
        this.animatedValue = new Animated.Value(0);
    };

    animate = () => {
        const value = this.props.flashcard.visibleAnswer ? this.toQuestionSide : this.toAnswerSide;
        Animated.spring(this.animatedValue, {
            toValue: value,
            friction: 8,
            tension: 10,
        }).start();
    };

    flipCard = () => {
        if (this.props.flashcard.visibleAnswer) {
            this.props.dispatch(updateAnswerVisibility(false));
        } else {
            this.props.dispatch(updateAnswerVisibility(true));
        }
    };

    componentWillUpdate = (nextProps) => {
        if (nextProps.flashcard.visibleAnswer !== this.props.flashcard.visibleAnswer) {
            this.animate();
        }
    };

    measureRightMarker = (event) => {
        this.rightMarkerWidth = event.nativeEvent.layout.width;
        this.rightMarkerHeight = event.nativeEvent.layout.height;
    };

    measureLeftMarker = (event) => {
        this.leftMarkerWidth = event.nativeEvent.layout.width;
        this.leftMarkerHeight = event.nativeEvent.layout.height;

    };

    measureUpMarker = (event) => {
        this.upMarkerWidth = event.nativeEvent.layout.width;
        this.upMarkerHeight = event.nativeEvent.layout.height;
    };

    measureDownMarker = (event) => {
        this.downMarkerWidth = event.nativeEvent.layout.width;
        this.downMarkerHeight = event.nativeEvent.layout.height;
    };

    getMarkerStyle = (direction) => {
        const dragLen = calculateDragLength(this.props.flashcard.x, this.props.flashcard.y);
        const swipeDirection = calculateSwipeDirection(this.props.flashcard.x, this.props.flashcard.y);
        const swipeDirectionString = DIRECTION[swipeDirection];
        let markerStyle = {};
        if (direction === swipeDirectionString) {
            const alpha = dragLen / 100;
            markerStyle = {
                ...markerStyle,
                opacity: alpha * 2, transform: [{scale: alpha}]
            };
            const widthCenter = (this.windowWidth / 2) - this.leftMarkerWidth + 12;
            const heightCenter = (this.windowHeight / 2) - this.rightMarkerHeight - 30;
            if (direction === 'right') {
                const right = ((this.rightMarkerWidth / 2) * alpha) - 20;
                markerStyle = {
                    ...markerStyle,
                    right,
                    top: heightCenter,
                }
            } else if (direction === 'left') {
                const left = ((this.leftMarkerWidth / 2) * alpha) - 15;
                markerStyle = {
                    ...markerStyle,
                    left,
                    top: heightCenter,
                }
            } else if (direction === 'up') {
                const top = ((this.upMarkerHeight / 2) * alpha) - 5;
                markerStyle = {
                    ...markerStyle,
                    top,
                    left: widthCenter,
                }
            } else if (direction === 'down') {
                const bottom = ((this.downMarkerHeight / 2) * alpha) + 90;
                markerStyle = {
                    ...markerStyle,
                    bottom,
                    left: widthCenter,
                }
            }

        }
        return markerStyle;
    };

    render = () => {
        return (
        <View>
            <Text style={[styles.baseMarkerStyle, styles.upMarker, this.getMarkerStyle('up')]}
                  onLayout={(event) => this.measureUpMarker(event)}><Emoji
                name="pensive"/>Unsure</Text>
            <Text style={[styles.baseMarkerStyle, styles.leftMarker, this.getMarkerStyle('left')]}
                  onLayout={(event) => this.measureLeftMarker(event)}><Emoji
                name="fearful"/>Bad</Text>
            <Text style={[styles.baseMarkerStyle, styles.downMarker, this.getMarkerStyle('down')]}
                  onLayout={(event) => this.measureDownMarker(event)}><Emoji
                name="innocent"/>Almost</Text>
            <Text style={[styles.baseMarkerStyle, styles.rightMarker, this.getMarkerStyle('right')]}
                  onLayout={(event) => this.measureRightMarker(event)}><Emoji name="smile"/>Good</Text>
            <TouchableOpacity onPress={() => this.flipCard()}>
                <FrontCard question={this.props.question} interpolateCb={this.interpolateWrapper}/>
                <BackCard interpolateCb={this.interpolateWrapper}
                          flipCardCb={this.flipCard}
                          submitCb={this.props.submit}
                          answer={this.props.answer}
                          evalItemId={this.props.evalItemId}
                />
            </TouchableOpacity>
        </View>
        )
    }
}


const submitEval = gql`
    mutation processEvaluation($itemId: String!, $evaluation: Int!){
        processEvaluation(itemId:$itemId, evaluation: $evaluation){
            item {
                _id
                flashcardId
                extraRepeatToday
                actualTimesRepeated
            }
            flashcard
            {
                _id question answer
            }
        }
    }
`;

export default graphql(submitEval, {
    props: ({ownProps, mutate}) => ({
        submit: ({itemId, evaluation}) => mutate({
            variables: {
                itemId,
                evaluation,
            },
            updateQueries: {
                CurrentItems: (prev, {mutationResult}) => {
                    const updateResults = update(prev, {
                        ItemsWithFlashcard: {
                            $set: mutationResult.data.processEvaluation
                        }
                    });
                    return updateResults;
                }
            }
        })
    })
})(connect(state => state)(Flashcard));
