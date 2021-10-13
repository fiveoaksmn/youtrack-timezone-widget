import 'babel-polyfill';
import DashboardAddons from 'hub-dashboard-addons';
import {render} from "react-dom";
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Grid, Row, Col} from '@jetbrains/ring-ui/components/grid/grid';
import Panel from '@jetbrains/ring-ui/components/panel/panel';
import Button from '@jetbrains/ring-ui/components/button/button';
import Input, {Size as InputSize} from '@jetbrains/ring-ui/components/input/input';
import Select from '@jetbrains/ring-ui/components/select/select';
import Checkbox from '@jetbrains/ring-ui/components/checkbox/checkbox';
import moment from "moment";
import "moment-timezone";
import { v4 as uuid } from "uuid";
import upIcon from '@jetbrains/icons/chevron-up.svg';
import downIcon from '@jetbrains/icons/chevron-down.svg';
import deleteIcon from '@jetbrains/icons/cancelled.svg';
import styles from './app.css';

const COUNTDOWN_TICK_MS = 1000;

class Widget extends Component{

    tzList = [];
    dateFormat = "yyyy-MM-DD";
    timeFormat = "";

    static propTypes = {
        dashboardApi: PropTypes.object,
        registerWidgetApi: PropTypes.func
    };

    constructor( props ){
        super( props );
        const { registerWidgetApi, dashboardApi } = props;

        this.state = {
            isConfiguring: true,
            showLocal: true,
            showSeconds: false,
            show24Hour: false,
            showDate: false,
            timeZones: []
        };

        let tzList = moment.tz.names();
        for( let i = 0; i < tzList.length; i++ ){
            this.tzList.push( { key: tzList[ i ], label: tzList[ i ] } );
        }

        registerWidgetApi({
            onConfigure: () => this.setState({ isConfiguring: true } )
        });

        this.initialize( dashboardApi );
    }

    // Render on a timer to keep time current
    componentDidMount() {
        this.initialize(this.props.dashboardApi);
        setInterval(() =>
            this.setState({}), COUNTDOWN_TICK_MS);
    }

    initialize( dashboardApi ){
        dashboardApi.readConfig().then( config => {
            if( ! config ){
                dashboardApi.enterConfigMode();
                this.setState( { isConfiguring: true } );
                return;
            }
            this.setState(
                {
                    isConfiguring: false,
                    timeZones: config.timeZones,
                    showLocal: config.showLocal,
                    showSeconds: config.showSeconds,
                    show24Hour: config.show24Hour,
                    showDate: config.showDate

                }
            );
            this.props.dashboardApi.setTitle( "Timezones" );
            this.setFormat();
        });
    }

    setFormat(){
        let seconds = "";
        if( this.state.showSeconds ){
            seconds = ":ss";
        }
        if( this.state.show24Hour ){
            this.timeFormat = "H:mm" + seconds;
        }else{
            this.timeFormat = "h:mm" + seconds + " A";
        }
    }

    changeName( key, e ){
        let timeZones = this.state.timeZones;
        for( let i = 0; i < timeZones.length; i++ ){
            if( timeZones[ i ].key === key ){
                timeZones[ i ].name = e.target.value;
            }
        }
        this.setState( { timeZones: timeZones } );
    }

    changeTimeZone( key, value ){
        let timeZones = this.state.timeZones;
        for( let i = 0; i < timeZones.length; i++ ){
            if( timeZones[ i ].key === key ){
                timeZones[ i ].tz = value.key;
            }
        }
        this.setState( { timeZones: timeZones } );
    }

    addTimeZone = async() => {
        this.setState( { timeZones: [ ...this.state.timeZones, { key: uuid(), name: "", tz: "" } ] } );
    }

    selectedTimezone( tz ){
        for( let i = 0; i < this.tzList.length; i++ ){
            if( this.tzList[ i ].key === tz ){
                return this.tzList[ i ];
            }
        }
        return { key:"", label: "" };
    }

    moveTimeZone( index, direction ){
        let timeZones = this.state.timeZones;
        if( ( index === 0 && direction < 0 ) || ( index > ( timeZones.length - 1 ) && direction > 0 ) ){
            return;
        }
        timeZones[ index ] = timeZones.splice( ( index + direction ), 1, timeZones[ index ] )[ 0 ];
        this.setState({ timeZones: timeZones } );
    }

    removeTimeZone( key ){
        let timeZones = this.state.timeZones;
        for (let i = 0; i < this.state.timeZones.length; i++) {
            if (timeZones[i].key === key) {
                timeZones.splice( i, 1 );
                i = this.state.timeZones.length;
            }
        }
        this.setState({timeZones: timeZones});
    }

    changeShowLocal = e => this.setState({
        showLocal: e.target.checked
    });

    changeShowSeconds = e => this.setState({
        showSeconds: e.target.checked
    });

    changeShowDate = e => this.setState({
        showDate: e.target.checked
    });

    changeShow24Hour = e => this.setState({
        show24Hour: e.target.checked
    });

    saveConfig = async() => {
        const {
            timeZones,
            showLocal,
            showSeconds,
            show24Hour,
            showDate
        } = this.state;
        await this.props.dashboardApi.storeConfig( {
            timeZones,
            showLocal,
            showSeconds,
            show24Hour,
            showDate
        } );
        this.setState( { isConfiguring: false } );
        this.setFormat();
    };

    cancelConfig = async() => {
        const {dashboardApi} = this.props;
        const config = await dashboardApi.readConfig();
        if( ! config ){
            dashboardApi.removeWidget();
        }else{
            this.setState({ isConfiguring: false } );
            await this.props.dashboardApi.exitConfigMode();
            this.initialize( dashboardApi );
        }
    };

    renderConfiguration(){
        let args = {
            multiple: false,
            data: this.tzList,
            filter: {
                placeholder: 'Search'
            }
        };

        if( this.state.timeZones.length === 0 ){
            this.addTimeZone();
        }
        let last = this.state.timeZones.length - 1;

        return (
            <div className={styles.widget}>
                <br/>
                <Grid>
                { this.state.timeZones.map( ( tz, index ) => (

                    <Row middle="xs">
                        <Col xs={12} sm={12} md={12} lg={12}>
                        <Select
                            selectedLabel={"Timezone " + ( index + 1 )}
                             label="Select timezone"
                            id={tz.key}
                            size={InputSize.FULL}
                            {...args}
                            selected={this.selectedTimezone( tz.tz )}
                            // onSelect={this.selectTimeZones}
                            onSelect={ selected => this.changeTimeZone( tz.key, selected ) }
                        />
                        </Col>
                        <Col xs={9} sm={9} md={9} lg={9}>
                        <Input
                        size={ InputSize.AUTO }
                        placeholder="Name"
                        onChange={ e => this.changeName( tz.key, e ) }
                        value={ tz.name }
                        />
                        </Col>
                        <Col xs={1} sm={1} md={1} lg={1}>
                        <Button
                            icon={ upIcon }
                            primary={ false }
                            disabled={ index === 0 }
                            onClick={ e => this.moveTimeZone( index, -1 ) }
                        >{}</Button>
                        </Col>
                        <Col xs={1} sm={1} md={1} lg={1}>
                        <Button
                            icon={ downIcon }
                            primary={ false }
                            disabled={ index === last }
                            onClick={ e => this.moveTimeZone( index, 1 ) }
                        >{}</Button>
                        </Col>
                        <Col xs={1} sm={1} md={1} lg={1}>
                        <Button
                            icon={ deleteIcon }
                            primary={ false }
                            disabled={ this.state.timeZones.length <= 1 }
                            onClick={ e => this.removeTimeZone( tz.key ) }
                        >{}</Button>
                        </Col>
                    </Row>
                ))}
                    <Row>
                    <Col>
                <Button
                    primary={ false }
                    onClick={ this.addTimeZone }
                >{ 'Add' }</Button>
                    </Col></Row>

                    <Row><Col xs={12}>
                    <Checkbox
                        label={'Show Local'}
                        checked={this.state.showLocal}
                        onChange={this.changeShowLocal}
                    />
                    </Col></Row><Row><Col xs={12}>
                    <Checkbox
                        label={'Show Seconds'}
                        checked={this.state.showSeconds}
                        onChange={this.changeShowSeconds}
                    />
                </Col></Row><Row><Col xs={12}>
                    <Checkbox
                        label={'Show Dates'}
                        checked={this.state.showDate}
                        onChange={this.changeShowDate}
                    />
                </Col></Row><Row><Col xs={12}>
                    <Checkbox
                        label={'24 Hour Format'}
                        checked={this.state.show24Hour}
                        onChange={this.changeShow24Hour}
                    />
                </Col></Row>
                </Grid>

                <Panel className={styles.formFooter}>
                    <Button
                        primary={ true }
                        onClick={ this.saveConfig }
                    >{ 'Save' }</Button>
                    <Button onClick={ this.cancelConfig}>{ 'Cancel' }</Button>
                </Panel>
            </div>
        )
    }

    timeZoneItem( timeZones ){
        const showDate = this.state.showDate;
        const dateFormat = this.dateFormat;
        const timeFormat = this.timeFormat;

        let values = [];
        if( this.state.showLocal ){
            values.push( { name: "Local", tz: "Local" } );
        }
        timeZones.forEach( value => values.push( value ) );

        return values.map( function( tz ) {
            let name = tz.name;
            if( name.length === 0 ){
                name = tz.tz;
            }

            let date = "";
            let time;
            if( tz.tz === "Local" ){
                if( showDate ){
                    date = moment().format( dateFormat );
                }
                time = moment().format( timeFormat );
            }else if( tz.tz !== undefined && tz.tz.length > 0 ){
                if( showDate ){
                    date = moment().tz( tz.tz ).format( dateFormat );
                }
                time = moment().tz( tz.tz ).format( timeFormat );
            }

            return (
                <div class={styles.timeZone}>
                    <div class={styles.timeZoneName}>{name}</div>
                    <div class={styles.timeZoneValue}>
                        <span class={styles.timeZoneDate}>{date}</span><span class={styles.timeZoneTime}>{time}</span>
                    </div>
                </div>
            )
        });
    }

    render(){
        const {
            isConfiguring,
            timeZones
        } = this.state;

        if( isConfiguring ){
            return this.renderConfiguration();
        }

        return (
            <div className={styles.widget}>
                {this.timeZoneItem( timeZones )}
            </div>
        )
    }
}

DashboardAddons.registerWidget( ( dashboardApi, registerWidgetApi ) =>
    render(
        <Widget
            dashboardApi={dashboardApi}
            registerWidgetApi={registerWidgetApi}
        />,
        document.getElementById('app-container')
    )
);
