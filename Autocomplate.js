/**
 * Created by Administrator on 15-10-29.
 */
/* globals XMLHttpRequest: true */
'use strict';

var React = require('react-native');
var {StyleSheet, TextInput, View, ListView, Image, Text, Dimensions, TouchableHighlight, Platform, ActivityIndicatorIOS, ProgressBarAndroid} = React;
var Qs = require('qs');
var extend = require('extend');

exports.create = function(options = {}) {
    options.placeholder = options.placeholder || 'Search';
    options.onPress = options.onPress || () => {};
    options.minLength = options.minLength || 0;
    options.fetchDetails = options.fetchDetails || false;
    options.autoFocus = options.autoFocus || false;
    options.getDefaultValue = options.getDefaultValue || function() { return ''; };
    options.timeout = options.timeout || 20000;
    options.onTimeout = options.onTimeout || () => {
        console.warn('google places autocomplete: request timeout');
    };

    options.query.key = options.query.key || 'missing api key';
    options.query.language = options.query.language || 'en';
    options.query.types = options.query.types || 'geocode';

    var defaultStyles = {
        container: {

        },
        textInputContainer: {
            backgroundColor: '#C9C9CE',
            height: 44,
            borderTopColor: '#7e7e7e',
            borderBottomColor: '#b5b5b5',
            borderTopWidth: 0.5,
            borderBottomWidth: 0.5,
        },
        textInput: {
            backgroundColor: '#FFFFFF',
            height: 28,
            borderRadius: 5,
            paddingTop: 4.5,
            paddingBottom: 4.5,
            paddingLeft: 10,
            paddingRight: 10,
            marginTop: 7.5,
            marginLeft: 8,
            marginRight: 8,
            fontSize: 15,
        },
        poweredContainer: {
            justifyContent: 'center',
            alignItems: 'center',
        },
        powered: {
            marginTop: 15,
        },
        listView: {
            height: Dimensions.get('window').height - 44,
        },
        row: {
            padding: 13,
            height: 44,
            flexDirection: 'row',
        },
        separator: {
            height: 1,
            backgroundColor: '#c8c7cc',
        },
        description: {
        },
        loader: {
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'flex-end',
            height: 20,
        },
        androidLoader: {
            marginRight: -15
        },
    };

    var styles = StyleSheet.create(extend(defaultStyles, options.styles));

    var GooglePlacesAutocomplete = React.createClass({
        getInitialState() {
            var ds = new ListView.DataSource({rowHasChanged: function(r1, r2) {
                if (typeof r1.isLoading !== 'undefined') {
                    return true;
                }
                return r1 !== r2;
            }});
            return {
                text: options.getDefaultValue(),
                dataSource: ds.cloneWithRows([]),
                listViewDisplayed: false,
            };
        },
        _abortRequests() {
            for (let i = 0; i < this._requests.length; i++) {
                this._requests[i].abort();
            }
            this._requests = [];
        },
        componentWillUnmount() {
            this._abortRequests();
        },
        _enableRowLoader(rowData) {
            for (let i = 0; i < this._results.length; i++) {
                if (this._results[i].place_id === rowData.place_id) {
                    this._results[i].isLoading = true;
                    this.setState({
                        dataSource: this.state.dataSource.cloneWithRows(this._results),
                    });
                    break;
                }
            }
        },
        _disableRowLoaders() {
            if (this.isMounted()) {//只有组件还处于挂载状态下，才有setState从而更新视图的意义。
                for (let i = 0; i < this._results.length; i++) {
                    if (this._results[i].isLoading === true) {
                        this._results[i].isLoading = false;
                    }
                }
                this.setState({
                    dataSource: this.state.dataSource.cloneWithRows(this._results),
                });
            }
        },
        _onPress(rowData) {
            if (options.fetchDetails === true) {
                if (rowData.isLoading === true) {
                    // already requesting
                    return;
                } else {
                    this._abortRequests();
                }

                // display loader
                this._enableRowLoader(rowData);

                // fetch details
                var request = new XMLHttpRequest();
                this._requests.push(request);
                request.timeout = options.timeout;
                request.ontimeout = options.onTimeout;
                request.onreadystatechange = (e) => {
                    if (request.readyState !== 4) {
                        return;
                    }
                    if (request.status === 200) {
                        var responseJSON = JSON.parse(request.responseText);
                        if (responseJSON.status === 'OK') {
                            if (this.isMounted()) {
                                var details = responseJSON.result;
                                this._disableRowLoaders();
                                if (typeof this.refs.textInput.blur === 'function') {
                                    this.refs.textInput.blur();
                                }

                                this.setState({
                                    text: rowData.description,
                                    listViewDisplayed: false,
                                });

                                delete rowData.isLoading;
                                options.onPress(rowData, details);
                            }
                        } else {
                            this._disableRowLoaders();
                            console.warn('google places autocomplete: '+responseJSON.status);
                        }
                    } else {
                        this._disableRowLoaders();
                        console.warn("google places autocomplete: request could not be completed or has been aborted");
                    }
                };
                console.warn('https://maps.googleapis.com/maps/api/place/details/json?'+Qs.stringify({
                        key: options.query.key,
                        placeid: rowData.place_id,
                        language: options.query.language,
                    }));
                request.open('GET', 'https://maps.googleapis.com/maps/api/place/details/json?'+Qs.stringify({
                        key: options.query.key,
                        placeid: rowData.place_id,
                        language: options.query.language,
                    }));
                //request.open('GET', 'https://192.168.0.100/siipa/baojia/json.php?country='+encodeURI(text));
                request.send();
            } else {
                this.setState({
                    text: rowData.description,
                    listViewDisplayed: false,
                });

                if (typeof this.refs.textInput.blur === 'function') {
                    this.refs.textInput.blur();
                }
                delete rowData.isLoading;
                options.onPress(rowData);
            }
        },
        _results: [],
        _requests: [],
        _request(text) {
            this._abortRequests();
            if (text.length >= options.minLength) {
                var request = new XMLHttpRequest();
                this._requests.push(request);
                request.timeout = options.timeout;
                request.ontimeout = options.onTimeout;
                request.onreadystatechange = (e) => {
                    if (request.readyState !== 4) {
                        return;
                    }
                    if (request.status === 200) {
                        var responseJSON = JSON.parse(request.responseText);
                        if (typeof responseJSON.predictions !== 'undefined'&& responseJSON.status == 'ok') {
                            if (this.isMounted()) {
                                this._results = responseJSON.predictions;
                                this.setState({
                                    dataSource: this.state.dataSource.cloneWithRows(responseJSON.predictions),
                                });
                            }
                        }else {
                            this._results = [];
                            this.setState({
                                dataSource: this.state.dataSource.cloneWithRows([]),
                            });
                        }

                        if (typeof responseJSON.error_message !== 'undefined') {
                            console.warn('google places autocomplete: '+responseJSON.error_message);
                        }
                    } else {
                        console.warn("google places autocomplete: request could not be completed or has been aborted");
                    }
                };

                //console.warn('https://maps.googleapis.com/maps/api/place/autocomplete/json?&input='+encodeURI(text)+'&'+Qs.stringify(options.query));
                //request.open('GET', 'https://maps.googleapis.com/maps/api/place/autocomplete/json?&input='+encodeURI(text)+'&'+Qs.stringify(options.query));
                console.warn('http://192.168.0.100/siipa/baojia/json.php?country='+encodeURI(text));
                request.open('GET', 'http://192.168.0.100/siipa/baojia/json.php?country='+encodeURI(text));

                request.send();
            } else {
                this._results = [];
                this.setState({
                    dataSource: this.state.dataSource.cloneWithRows([]),
                });
            }
        },
        _onChangeText(text) {
            this._request(text);
            this.setState({
                text: text,
                listViewDisplayed: true,
            });
        },
        _getRowLoader() {
            if (Platform.OS === 'android') {
                /* jshint ignore:start */
                return (
                    <ProgressBarAndroid
                        style={styles.androidLoader}
                        styleAttr="Inverse"
                        />
                );
            } else {
                return (
                    <ActivityIndicatorIOS
                        animating={true}
                        size="small"
                        />
                );
                /* jshint ignore:end */
            }
        },
        _renderRow(rowData = {}) {
            rowData.description = rowData.description || 'Unknown';
            /* jshint ignore:start */
            return (
                <TouchableHighlight
                    onPress={() =>
            this._onPress(rowData)
          }
                    underlayColor="#c8c7cc"
                    >
                    <View>
                        <View style={styles.row}>
                            <Text
                                style={styles.description}
                                numberOfLines={1}
                                >{rowData.description}</Text>
                            <View
                                style={styles.loader}
                                >
                                {rowData.isLoading === true ? this._getRowLoader() : null}
                            </View>
                        </View>
                        <View style={styles.separator} />
                    </View>
                </TouchableHighlight>
            );
            /* jshint ignore:end */
        },
        _onBlur() {
            this.setState({listViewDisplayed: false});
        },
        _onFocus() {
            this.setState({listViewDisplayed: true});
        },
        _getListView() {
            if (this.state.text !== '' && this.state.listViewDisplayed === true) {
                /* jshint ignore:start */
                return (
                    <ListView
                        keyboardShouldPersistTaps={true}
                        style={styles.listView}
                        dataSource={this.state.dataSource}
                        renderRow={this._renderRow}
                        automaticallyAdjustContentInsets={false}
                        />
                );
            } else {
                return (
                    <View style={styles.poweredContainer}>

                    </View>
                );
                /* <Image
                 style={styles.powered}
                 resizeMode={Image.resizeMode.contain}
                 source={require('image!powered_by_google_on_white')}
                 />
                 jshint ignore:end */
            }
        },
        render() {
            /* jshint ignore:start */
            return (
                <View style={styles.container}>
                    <View style={styles.textInputContainer}>
                        <TextInput
                            ref='textInput'
                            autoFocus={options.autoFocus}
                            style={styles.textInput}
                            onChangeText={this._onChangeText}
                            value={this.state.text}
                            placeholder={options.placeholder}
                            onBlur={this._onBlur}
                            onFocus={this._onFocus}
                            clearButtonMode="while-editing"
                            />
                    </View>
                    {this._getListView()}
                </View>
            );
            /* jshint ignore:end */
        },
    });
    return GooglePlacesAutocomplete;
};