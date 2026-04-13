define([
    'react',
    'react-dom',
    'react-dom/client',
    'axios',
    'Magento_Ui/js/modal/alert',
    'mage/translate'
], function (
    React,
    ReactDOM,
    ReactDOMClient,
    axios,
    alert,
    $t
) {
    function showAlert(content, title) {
        alert({
            title: $t(title) || 'OPcache',
            content: $t(content) || '',
            actions: {
                always: function () {}
            }
        });
    }

    function _extends() {
        return _extends = Object.assign ? Object.assign.bind() : function(n) {
            for (var e = 1; e < arguments.length; e++) {
                var t = arguments[e];
                for (var r in t)({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
            }
            return n;
        }, _extends.apply(null, arguments);
    }

    function _defineProperty(e, r, t) {
        return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
            value: t,
            enumerable: !0,
            configurable: !0,
            writable: !0
        }) : e[r] = t, e;
    }

    function _toPropertyKey(t) {
        var i = _toPrimitive(t, "string");
        return "symbol" == typeof i ? i : i + "";
    }

    function _toPrimitive(t, r) {
        if ("object" != typeof t || !t) return t;
        var e = t[Symbol.toPrimitive];
        if (void 0 !== e) {
            var i = e.call(t, r || "default");
            if ("object" != typeof i) return i;
            throw new TypeError("@@toPrimitive must return a primitive value.");
        }
        return ("string" === r ? String : Number)(t);
    }

    // Cache CSS custom properties once at module init (safe: read-only, no DOM mutation)
    const CSS_VARS = (() => {
        try {
            const root = document.documentElement;
            const get = (name, fallback) => {
                const v = getComputedStyle(root).getPropertyValue(name);
                return (v && v.trim()) || fallback;
            };
            return {
                gaugeFill: get('--opcache-gui-graph-track-fill-color', '#eb5202'),
                gaugeBg:   get('--opcache-gui-graph-track-background-color', '#CCC')
            };
        } catch (_) {
            return { gaugeFill: '#eb5202', gaugeBg: '#CCC' };
        }
    })();

    class Interface extends React.Component {
        constructor(props) {
            super(props);
            _defineProperty(this, "startTimer", () => {
                if (this.polling) return; // Guard: prevent duplicate polling interval
                this.setState({ realtime: true });
                this.polling = setInterval(() => {

                    this.setState({ fetching: true, resetting: false });

                    axios.get(this.props.api.stateUrl, {
                        params: {
                            action: 'poll',
                            form_key: window.FORM_KEY,
                            t: Date.now()
                        }
                    })
                    .then(response => {
                        this.setState({ opstate: response.data, fetching: false });
                    })
                    .catch(() => {
                        if (this._isMounted) {
                            this.setState({ fetching: false });
                            this.stopTimer();
                        }
                    });

                }, this.props.realtimeRefresh * 1000);
            });
            _defineProperty(this, "stopTimer", () => {
                this.setState({ realtime: false, resetting: false });
                if (this.polling) {
                    clearInterval(this.polling);
                    this.polling = null;
                }
            });
            _defineProperty(this, "realtimeHandler", () => {
                const realtime = !this.state.realtime;
                if (!realtime) {
                    this.stopTimer();
                    this.removeCookie();
                } else {
                    this.startTimer();
                    this.setCookie();
                }
            });
            _defineProperty(this, "resetHandler", () => {
                if (this.state.realtime) {
                    this.setState({ resetting: true });

                    axios.get(this.props.api.stateUrl, {
                        params: {
                            action: 'reset',
                            form_key: window.FORM_KEY
                        }
                    })
                    .then(response => {
                        if (!this._isMounted) return;
                        if (response.data && response.data.success) {
                            showAlert(this.txt('OPcache successfully reset.'));
                        }
                    })
                    .catch(() => {
                        if (this._isMounted) {
                            showAlert(this.txt('Reset failed. Please try again.'), this.txt('Error'));
                            this.setState({ resetting: false });
                        }
                    });
                } else {
                    showAlert(
                        this.txt('Please enable real-time update to use this feature.'),
                        this.txt('Real-time required')
                    );
                }
            });
            _defineProperty(this, "setCookie", () => {
                let d = new Date();
                d.setTime(d.getTime() + this.props.cookie.ttl * 86400000);
                document.cookie = `${this.props.cookie.name}=true;expires=${d.toUTCString()};path=/${this.isSecure ? ';secure' : ''}`;
            });
            _defineProperty(this, "removeCookie", () => {
                document.cookie = `${this.props.cookie.name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/${this.isSecure ? ';secure' : ''}`;
            });
            _defineProperty(this, "getCookie", () => {
                const v = document.cookie.match(`(^|;) ?${this.props.cookie.name}=([^;]*)(;|$)`);
                return v ? !!v[2] : false;
            });
            _defineProperty(this, "txt", (text, ...args) => {
                if (this.props.language !== null && Object.prototype.hasOwnProperty.call(this.props.language, text) && this.props.language[text]) {
                    text = this.props.language[text];
                }
                args.forEach((arg, i) => {
                    text = text.replaceAll(`{${i}}`, arg);
                });
                return text;
            });

            this.state = {
                realtime: this.getCookie(),
                resetting: false,
                opstate: props.opstate
            };
            this.polling = null; // null rather than false for explicit absence-of-timer semantics
            this.isSecure = window.location.protocol === 'https:';
            this._isMounted = false;
        }

        componentDidMount() {
            this._isMounted = true;
            if (this.state.realtime) {
                this.startTimer();
            }
        }

        componentWillUnmount() {
            this._isMounted = false;
            this.stopTimer();
        }

        render() {
            const { opstate, realtimeRefresh, ...otherProps } = this.props;
            return /*#__PURE__*/ React.createElement(React.Fragment, null,
                /*#__PURE__*/ React.createElement("header", null,
                    /*#__PURE__*/ React.createElement(MainNavigation, _extends({}, otherProps, {
                        opstate: this.state.opstate,
                        realtime: this.state.realtime,
                        resetting: this.state.resetting,
                        realtimeHandler: this.realtimeHandler,
                        resetHandler: this.resetHandler,
                        txt: this.txt
                    }))
                ),
                /*#__PURE__*/ React.createElement(Footer, {
                    version: this.props.opstate.version.gui,
                    txt: this.txt
                })
            );
        }
    }

    function MainNavigation(props) {
        return /*#__PURE__*/ React.createElement("nav", { className: "main-nav" },
            /*#__PURE__*/ React.createElement(Tabs, null,
                /*#__PURE__*/ React.createElement("div", {
                    label: props.txt($t("Overview")),
                    tabId: "overview",
                    tabIndex: 1
                },
                    /*#__PURE__*/ React.createElement(OverviewCounts, {
                        overview: props.opstate.overview,
                        highlight: props.highlight,
                        useCharts: props.useCharts,
                        txt: props.txt
                    }),
                    /*#__PURE__*/ React.createElement("div", {
                        id: "info",
                        className: "tab-content-overview-info"
                    },
                        /*#__PURE__*/ React.createElement(GeneralInfo, {
                            start: props.opstate.overview && props.opstate.overview.readable.start_time || null,
                            reset: props.opstate.overview && props.opstate.overview.readable.last_restart_time || null,
                            version: props.opstate.version,
                            jit: props.opstate.jitState,
                            txt: props.txt
                        }),
                        /*#__PURE__*/ React.createElement(Directives, {
                            directives: props.opstate.directives,
                            txt: props.txt
                        }),
                        /*#__PURE__*/ React.createElement(Functions, {
                            functions: props.opstate.functions,
                            txt: props.txt
                        })
                    )
                ),
                props.allow.filelist && /*#__PURE__*/ React.createElement("div", {
                    label: props.txt($t("Cached")),
                    tabId: "cached",
                    tabIndex: 2
                },
                    /*#__PURE__*/ React.createElement(CachedFiles, {
                        api: props.api,
                        perPageLimit: props.perPageLimit,
                        allFiles: props.opstate.files,
                        searchTerm: props.searchTerm,
                        debounceRate: props.debounceRate,
                        allow: {
                            fileList: props.allow.filelist,
                            invalidate: props.allow.invalidate
                        },
                        realtime: props.realtime,
                        txt: props.txt
                    })
                ),
                props.allow.filelist && props.opstate.blacklist.length && /*#__PURE__*/ React.createElement("div", {
                    label: props.txt($t("Ignored")),
                    tabId: "ignored",
                    tabIndex: 3
                },
                    /*#__PURE__*/ React.createElement(IgnoredFiles, {
                        perPageLimit: props.perPageLimit,
                        allFiles: props.opstate.blacklist,
                        allow: {
                            fileList: props.allow.filelist
                        },
                        txt: props.txt
                    })
                ),
                props.allow.filelist && props.opstate.preload.length && /*#__PURE__*/ React.createElement("div", {
                    label: props.txt($t("Preloaded")),
                    tabId: "preloaded",
                    tabIndex: 4
                },
                    /*#__PURE__*/ React.createElement(PreloadedFiles, {
                        perPageLimit: props.perPageLimit,
                        allFiles: props.opstate.preload,
                        allow: {
                            fileList: props.allow.filelist
                        },
                        txt: props.txt
                    })
                ),
                props.allow.reset && /*#__PURE__*/ React.createElement("div", {
                    label: props.txt($t("Reset cache")),
                    tabId: "resetCache",
                    className: `nav-tab-link-reset${props.resetting ? ' is-resetting pulse' : ''}`,
                    handler: props.resetHandler,
                    tabIndex: 5
                }),
                props.allow.realtime && /*#__PURE__*/ React.createElement("div", {
                    label: props.txt(`${props.realtime ? 'Disable' : 'Enable'} real-time update`),
                    tabId: "toggleRealtime",
                    className: `nav-tab-link-realtime${props.realtime ? ' live-update pulse' : ''}`,
                    handler: props.realtimeHandler,
                    tabIndex: 6
                })
            )
        );
    }

    class Tabs extends React.Component {
        constructor(props) {
            super(props);
            _defineProperty(this, "onClickTabItem", tab => {
                this.setState({ activeTab: tab });
            });
            this.state = {
                activeTab: React.Children.toArray(this.props.children).filter(Boolean)[0].props.label
            };
        }
        render() {
            const { onClickTabItem, state: { activeTab } } = this;
            const children = React.Children.toArray(this.props.children).filter(Boolean);
            return /*#__PURE__*/ React.createElement(React.Fragment, null,
                /*#__PURE__*/ React.createElement("ul", { className: "nav-tab-list" },
                    children.map(child => {
                        const { tabId, label, className, handler, tabIndex } = child.props;
                        return /*#__PURE__*/ React.createElement(Tab, {
                            activeTab: activeTab,
                            key: tabId,
                            label: label,
                            onClick: handler || onClickTabItem,
                            className: className,
                            tabIndex: tabIndex,
                            tabId: tabId
                        });
                    })
                ),
                /*#__PURE__*/ React.createElement("div", { className: "tab-content" },
                    children.map(child => /*#__PURE__*/ React.createElement("div", {
                        key: child.props.label,
                        style: { display: child.props.label === activeTab ? 'block' : 'none' },
                        id: `${child.props.tabId}-content`
                    }, child.props.children))
                )
            );
        }
    }

    class Tab extends React.Component {
        constructor(...args) {
            super(...args);
            _defineProperty(this, "onClick", () => {
                const { label, onClick } = this.props;
                onClick(label);
            });
        }
        render() {
            const { onClick, props: { activeTab, label, tabIndex, tabId } } = this;
            let className = 'nav-tab';
            if (this.props.className) {
                className += ` ${this.props.className}`;
            }
            if (activeTab === label) {
                className += ' active';
            }
            return /*#__PURE__*/ React.createElement("li", {
                className: className,
                onClick: onClick,
                tabIndex: tabIndex,
                role: "tab",
                "aria-controls": `${tabId}-content`
            }, label);
        }
    }

    function OverviewCounts(props) {
        if (props.overview === false) {
            return /*#__PURE__*/ React.createElement("p", {
                className: "file-cache-only",
                dangerouslySetInnerHTML: {
                    __html: props.txt(
                        $t(`You have <i>opcache.file_cache_only</i> turned on.  As a result, the memory information is not available.  Statistics and file list may also not be returned by <i>opcache_get_statistics()</i>.`)
                    )
                }
            });
        }
        const graphList = [{
            id: 'memoryUsageCanvas',
            title: props.txt($t('memory')),
            show: props.highlight.memory,
            value: props.overview.used_memory_percentage
        }, {
            id: 'hitRateCanvas',
            title: props.txt($t('hit rate')),
            show: props.highlight.hits,
            value: props.overview.hit_rate_percentage
        }, {
            id: 'keyUsageCanvas',
            title: props.txt($t('keys')),
            show: props.highlight.keys,
            value: props.overview.used_key_percentage
        }, {
            id: 'jitUsageCanvas',
            title: props.txt($t('JIT buffer')),
            show: props.highlight.jit,
            value: props.overview.jit_buffer_used_percentage
        }];
        return /*#__PURE__*/ React.createElement("div", {
            id: "counts",
            className: "tab-content-overview-counts"
        },
            graphList.map(graph => {
                if (!graph.show) return null;
                return /*#__PURE__*/ React.createElement("div", { className: "widget-panel", key: graph.id },
                    /*#__PURE__*/ React.createElement("h3", { className: "widget-header" }, graph.title),
                    /*#__PURE__*/ React.createElement(UsageGraph, {
                        charts: props.useCharts,
                        value: graph.value,
                        gaugeId: graph.id
                    })
                );
            }),
            /*#__PURE__*/ React.createElement(MemoryUsagePanel, {
                total: props.overview.readable.total_memory,
                used: props.overview.readable.used_memory,
                free: props.overview.readable.free_memory,
                wasted: props.overview.readable.wasted_memory,
                preload: props.overview.readable.preload_memory || null,
                wastedPercent: props.overview.wasted_percentage,
                jitBuffer: props.overview.readable.jit_buffer_size || null,
                jitBufferFree: props.overview.readable.jit_buffer_free || null,
                jitBufferFreePercentage: props.overview.jit_buffer_used_percentage || null,
                txt: props.txt
            }),
            /*#__PURE__*/ React.createElement(StatisticsPanel, {
                num_cached_scripts: props.overview.readable.num_cached_scripts,
                hits: props.overview.readable.hits,
                misses: props.overview.readable.misses,
                blacklist_miss: props.overview.readable.blacklist_miss,
                num_cached_keys: props.overview.readable.num_cached_keys,
                max_cached_keys: props.overview.readable.max_cached_keys,
                txt: props.txt
            }),
            props.overview.readable.interned && /*#__PURE__*/ React.createElement(InternedStringsPanel, {
                buffer_size: props.overview.readable.interned.buffer_size,
                strings_used_memory: props.overview.readable.interned.strings_used_memory,
                strings_free_memory: props.overview.readable.interned.strings_free_memory,
                number_of_strings: props.overview.readable.interned.number_of_strings,
                txt: props.txt
            })
        );
    }

    function GeneralInfo(props) {
        return /*#__PURE__*/ React.createElement("table", { className: "tables general-info-table" },
            /*#__PURE__*/ React.createElement("thead", null, /*#__PURE__*/ React.createElement("tr", null, /*#__PURE__*/ React.createElement("th", { colSpan: "2" }, props.txt('General info')))),
            /*#__PURE__*/ React.createElement("tbody", null,
                /*#__PURE__*/ React.createElement("tr", null, /*#__PURE__*/ React.createElement("td", null, "Zend OPcache"), /*#__PURE__*/ React.createElement("td", null, props.version.version)),
                /*#__PURE__*/ React.createElement("tr", null, /*#__PURE__*/ React.createElement("td", null, "PHP"), /*#__PURE__*/ React.createElement("td", null, props.version.php)),
                /*#__PURE__*/ React.createElement("tr", null, /*#__PURE__*/ React.createElement("td", null, props.txt('Host')), /*#__PURE__*/ React.createElement("td", null, props.version.host)),
                /*#__PURE__*/ React.createElement("tr", null, /*#__PURE__*/ React.createElement("td", null, props.txt('Server Software')), /*#__PURE__*/ React.createElement("td", null, props.version.server)),
                props.start ? /*#__PURE__*/ React.createElement("tr", null, /*#__PURE__*/ React.createElement("td", null, props.txt('Start time')), /*#__PURE__*/ React.createElement("td", null, props.start)) : null,
                props.reset ? /*#__PURE__*/ React.createElement("tr", null, /*#__PURE__*/ React.createElement("td", null, props.txt('Last reset')), /*#__PURE__*/ React.createElement("td", null, props.reset)) : null,
                /*#__PURE__*/ React.createElement("tr", null, /*#__PURE__*/ React.createElement("td", null, props.txt('JIT enabled')), /*#__PURE__*/ React.createElement("td", null, props.txt(props.jit.enabled ? "Yes" : "No"), props.jit.reason && /*#__PURE__*/ React.createElement("span", { dangerouslySetInnerHTML: { __html: ` (${props.jit.reason})` } })))
            )
        );
    }

    function Directives(props) {
        let directiveList = directive => {
            return /*#__PURE__*/ React.createElement("ul", { className: "directive-list" },
                directive.v.map((item, key) => {
                    return Array.isArray(item)
                        ? /*#__PURE__*/ React.createElement("li", { key: "sublist_" + key }, directiveList({ v: item }))
                        : /*#__PURE__*/ React.createElement("li", { key: key }, item);
                })
            );
        };
        let directiveNodes = props.directives.map(function(directive) {
            let map = { 'opcache.': '', '_': ' ' };
            let dShow = directive.k.replace(/opcache\.|_/gi, function(matched) { return map[matched]; });
            let vShow;
            if (directive.v === true || directive.v === false) {
                vShow = React.createElement('i', {}, props.txt(directive.v.toString()));
            } else if (directive.v === '') {
                vShow = React.createElement('i', {}, props.txt('no value'));
            } else {
                vShow = Array.isArray(directive.v) ? directiveList(directive) : directive.v;
            }
            let directiveLink = name => {
                if (name === 'opcache.jit_max_recursive_returns') {
                    return 'opcache.jit-max-recursive-return';
                }
                return ['opcache.file_update_protection', 'opcache.huge_code_pages', 'opcache.lockfile_path', 'opcache.opt_debug_level'].includes(name)
                    ? name
                    : name.replace(/_/g, '-');
            };
            return /*#__PURE__*/ React.createElement("tr", { key: directive.k },
                /*#__PURE__*/ React.createElement("td", { title: props.txt('View {0} manual entry', directive.k) },
                    /*#__PURE__*/ React.createElement("a", { href: 'https://php.net/manual/en/opcache.configuration.php#ini.' + directiveLink(directive.k), target: "_blank" }, dShow)
                ),
                /*#__PURE__*/ React.createElement("td", null, vShow)
            );
        });
        return /*#__PURE__*/ React.createElement("table", { className: "tables directives-table" },
            /*#__PURE__*/ React.createElement("thead", null, /*#__PURE__*/ React.createElement("tr", null, /*#__PURE__*/ React.createElement("th", { colSpan: "2" }, props.txt('Directives')))),
            /*#__PURE__*/ React.createElement("tbody", null, directiveNodes)
        );
    }

    function Functions(props) {
        return /*#__PURE__*/ React.createElement("div", { id: "functions" },
            /*#__PURE__*/ React.createElement("table", { className: "tables" },
                /*#__PURE__*/ React.createElement("thead", null, /*#__PURE__*/ React.createElement("tr", null, /*#__PURE__*/ React.createElement("th", null, props.txt('Available functions')))),
                /*#__PURE__*/ React.createElement("tbody", null,
                    props.functions.map(f => /*#__PURE__*/ React.createElement("tr", { key: f },
                        /*#__PURE__*/ React.createElement("td", null,
                            /*#__PURE__*/ React.createElement("a", { href: "https://php.net/" + f, title: props.txt('View manual page'), target: "_blank" }, f)
                        )
                    ))
                )
            )
        );
    }

    function UsageGraph(props) {
        const percentage = Math.round(props.value);
        return props.charts ? /*#__PURE__*/ React.createElement(ReactCustomizableProgressbar, {
            progress: percentage,
            radius: 100,
            strokeWidth: 30,
            trackStrokeWidth: 30,
            strokeColor: CSS_VARS.gaugeFill,
            trackStrokeColor: CSS_VARS.gaugeBg,
            gaugeId: props.gaugeId
        }) : /*#__PURE__*/ React.createElement("p", { className: "widget-value" },
            /*#__PURE__*/ React.createElement("span", { className: "large" }, percentage),
            /*#__PURE__*/ React.createElement("span", null, "%")
        );
    }

    /**
     * This component is from <https://github.com/martyan/react-customizable-progressbar/>
     * MIT License (MIT), Copyright (c) 2019 Martin Juzl
     */
    class ReactCustomizableProgressbar extends React.Component {
        constructor(props) {
            super(props);
            _defineProperty(this, "initAnimation", () => {
                this.setState({ animationInited: true });
            });
            _defineProperty(this, "getProgress", () => {
                const { initialAnimation, progress } = this.props;
                const { animationInited } = this.state;
                return initialAnimation && !animationInited ? 0 : progress;
            });
            _defineProperty(this, "getStrokeDashoffset", strokeLength => {
                const { counterClockwise, inverse, steps } = this.props;
                const progress = this.getProgress();
                const progressLength = strokeLength / steps * (steps - progress);
                if (inverse) return counterClockwise ? 0 : progressLength - strokeLength;
                return counterClockwise ? -1 * progressLength : progressLength;
            });
            _defineProperty(this, "getStrokeDashArray", (strokeLength, circumference) => {
                const { counterClockwise, inverse, steps } = this.props;
                const progress = this.getProgress();
                const progressLength = strokeLength / steps * (steps - progress);
                if (inverse) return `${progressLength}, ${circumference}`;
                return counterClockwise ? `${strokeLength * (progress / 100)}, ${circumference}` : `${strokeLength}, ${circumference}`;
            });
            _defineProperty(this, "getTrackStrokeDashArray", (strokeLength, circumference) => {
                const { initialAnimation } = this.props;
                const { animationInited } = this.state;
                if (initialAnimation && !animationInited) return `0, ${circumference}`;
                return `${strokeLength}, ${circumference}`;
            });
            _defineProperty(this, "getExtendedWidth", () => {
                const { strokeWidth, pointerRadius, pointerStrokeWidth, trackStrokeWidth } = this.props;
                const pointerWidth = pointerRadius + pointerStrokeWidth;
                if (pointerWidth > strokeWidth && pointerWidth > trackStrokeWidth) return pointerWidth * 2;
                else if (strokeWidth > trackStrokeWidth) return strokeWidth * 2;
                else return trackStrokeWidth * 2;
            });
            _defineProperty(this, "getPointerAngle", () => {
                const { cut, counterClockwise, steps } = this.props;
                const progress = this.getProgress();
                return counterClockwise ? (360 - cut) / steps * (steps - progress) : (360 - cut) / steps * progress;
            });
            this.state = { animationInited: false };
        }
        componentDidMount() {
            const { initialAnimation, initialAnimationDelay } = this.props;
            if (initialAnimation) setTimeout(this.initAnimation, initialAnimationDelay);
        }
        render() {
            const {
                radius,
                pointerRadius,
                pointerStrokeWidth,
                pointerFillColor,
                pointerStrokeColor,
                fillColor,
                trackStrokeWidth,
                trackStrokeColor,
                trackStrokeLinecap,
                strokeColor,
                strokeWidth,
                strokeLinecap,
                rotate,
                cut,
                trackTransition,
                transition,
                progress
            } = this.props;
            const d = 2 * radius;
            const width = d + this.getExtendedWidth();
            const circumference = 2 * Math.PI * radius;
            const strokeLength = circumference / 360 * (360 - cut);
            return /*#__PURE__*/ React.createElement("figure", {
                className: `graph-widget`,
                style: { width: `${width || 250}px` },
                "data-value": progress,
                id: this.props.gaugeId
            },
                /*#__PURE__*/ React.createElement("svg", {
                    width: width,
                    height: width,
                    viewBox: `0 0 ${width} ${width}`,
                    style: { transform: `rotate(${rotate}deg)` }
                },
                    trackStrokeWidth > 0 && /*#__PURE__*/ React.createElement("circle", {
                        cx: width / 2, cy: width / 2, r: radius,
                        fill: "none",
                        stroke: trackStrokeColor,
                        strokeWidth: trackStrokeWidth,
                        strokeDasharray: this.getTrackStrokeDashArray(strokeLength, circumference),
                        strokeLinecap: trackStrokeLinecap,
                        style: { transition: trackTransition }
                    }),
                    strokeWidth > 0 && /*#__PURE__*/ React.createElement("circle", {
                        cx: width / 2, cy: width / 2, r: radius,
                        fill: fillColor,
                        stroke: strokeColor,
                        strokeWidth: strokeWidth,
                        strokeDasharray: this.getStrokeDashArray(strokeLength, circumference),
                        strokeDashoffset: this.getStrokeDashoffset(strokeLength),
                        strokeLinecap: strokeLinecap,
                        style: { transition }
                    }),
                    pointerRadius > 0 && /*#__PURE__*/ React.createElement("circle", {
                        cx: d, cy: "50%", r: pointerRadius,
                        fill: pointerFillColor,
                        stroke: pointerStrokeColor,
                        strokeWidth: pointerStrokeWidth,
                        style: {
                            transformOrigin: '50% 50%',
                            transform: `rotate(${this.getPointerAngle()}deg) translate(${this.getExtendedWidth() / 2}px)`,
                            transition
                        }
                    })
                ),
                /*#__PURE__*/ React.createElement("figcaption", { className: `widget-value` }, progress, "%")
            );
        }
    }

    ReactCustomizableProgressbar.defaultProps = {
        radius: 100,
        progress: 0,
        steps: 100,
        cut: 0,
        rotate: -90,
        strokeWidth: 20,
        strokeColor: 'indianred',
        fillColor: 'none',
        strokeLinecap: 'round',
        transition: '.3s ease',
        pointerRadius: 0,
        pointerStrokeWidth: 20,
        pointerStrokeColor: 'indianred',
        pointerFillColor: 'white',
        trackStrokeColor: '#e6e6e6',
        trackStrokeWidth: 20,
        trackStrokeLinecap: 'round',
        trackTransition: '.3s ease',
        counterClockwise: false,
        inverse: false,
        initialAnimation: false,
        initialAnimationDelay: 0
    };

    function MemoryUsagePanel(props) {
        return /*#__PURE__*/ React.createElement("div", { className: "widget-panel" },
            /*#__PURE__*/ React.createElement("h3", { className: "widget-header" }, props.txt('memory usage')),
            /*#__PURE__*/ React.createElement("div", { className: "widget-value widget-info" },
                /*#__PURE__*/ React.createElement("p", null, /*#__PURE__*/ React.createElement("b", null, props.txt('total memory'), ":"), " ", props.total),
                /*#__PURE__*/ React.createElement("p", null, /*#__PURE__*/ React.createElement("b", null, props.txt('used memory'), ":"), " ", props.used),
                /*#__PURE__*/ React.createElement("p", null, /*#__PURE__*/ React.createElement("b", null, props.txt('free memory'), ":"), " ", props.free),
                props.preload && /*#__PURE__*/ React.createElement("p", null, /*#__PURE__*/ React.createElement("b", null, props.txt('preload memory'), ":"), " ", props.preload),
                /*#__PURE__*/ React.createElement("p", null, /*#__PURE__*/ React.createElement("b", null, props.txt('wasted memory'), ":"), " ", props.wasted, " (", props.wastedPercent, "%)"),
                props.jitBuffer && /*#__PURE__*/ React.createElement("p", null, /*#__PURE__*/ React.createElement("b", null, props.txt('jit buffer'), ":"), " ", props.jitBuffer),
                props.jitBufferFree && /*#__PURE__*/ React.createElement("p", null, /*#__PURE__*/ React.createElement("b", null, props.txt('jit buffer free'), ":"), " ", props.jitBufferFree, " (", 100 - props.jitBufferFreePercentage, "%)")
            )
        );
    }

    function StatisticsPanel(props) {
        return /*#__PURE__*/ React.createElement("div", { className: "widget-panel" },
            /*#__PURE__*/ React.createElement("h3", { className: "widget-header" }, props.txt('opcache statistics')),
            /*#__PURE__*/ React.createElement("div", { className: "widget-value widget-info" },
                /*#__PURE__*/ React.createElement("p", null, /*#__PURE__*/ React.createElement("b", null, props.txt('number of cached files'), ":"), " ", props.num_cached_scripts),
                /*#__PURE__*/ React.createElement("p", null, /*#__PURE__*/ React.createElement("b", null, props.txt('number of hits'), ":"), " ", props.hits),
                /*#__PURE__*/ React.createElement("p", null, /*#__PURE__*/ React.createElement("b", null, props.txt('number of misses'), ":"), " ", props.misses),
                /*#__PURE__*/ React.createElement("p", null, /*#__PURE__*/ React.createElement("b", null, props.txt('blacklist misses'), ":"), " ", props.blacklist_miss),
                /*#__PURE__*/ React.createElement("p", null, /*#__PURE__*/ React.createElement("b", null, props.txt('number of cached keys'), ":"), " ", props.num_cached_keys),
                /*#__PURE__*/ React.createElement("p", null, /*#__PURE__*/ React.createElement("b", null, props.txt('max cached keys'), ":"), " ", props.max_cached_keys)
            )
        );
    }

    function InternedStringsPanel(props) {
        return /*#__PURE__*/ React.createElement("div", { className: "widget-panel" },
            /*#__PURE__*/ React.createElement("h3", { className: "widget-header" }, props.txt('interned strings usage')),
            /*#__PURE__*/ React.createElement("div", { className: "widget-value widget-info" },
                /*#__PURE__*/ React.createElement("p", null, /*#__PURE__*/ React.createElement("b", null, props.txt('buffer size'), ":"), " ", props.buffer_size),
                /*#__PURE__*/ React.createElement("p", null, /*#__PURE__*/ React.createElement("b", null, props.txt('used memory'), ":"), " ", props.strings_used_memory),
                /*#__PURE__*/ React.createElement("p", null, /*#__PURE__*/ React.createElement("b", null, props.txt('free memory'), ":"), " ", props.strings_free_memory),
                /*#__PURE__*/ React.createElement("p", null, /*#__PURE__*/ React.createElement("b", null, props.txt('number of strings'), ":"), " ", props.number_of_strings)
            )
        );
    }

    class CachedFiles extends React.Component {
        constructor(props) {
            super(props);
            _defineProperty(this, "setSearchTerm", debounce(searchTerm => {
                this.setState({
                    searchTerm,
                    refreshPagination: !this.state.refreshPagination
                });
            }, this.props.debounceRate));
            _defineProperty(this, "onPageChanged", currentPage => {
                this.setState({ currentPage });
            });
            _defineProperty(this, "handleInvalidateAll", e => {
                e.preventDefault();
                if (this.props.realtime) {
                    axios.get(this.props.api.stateUrl, {
                        params: {
                            action: 'invalidate_searched',
                            term: this.state.searchTerm,
                            form_key: window.FORM_KEY
                        }
                    })
                    .then(response => {
                        showAlert(
                            response.data && response.data.success
                                ? this.props.txt('Invalidation requested for matching files.')
                                : this.props.txt('Invalidation failed.'),
                            response.data && response.data.success ? null : this.props.txt('Error')
                        );
                    })
                    .catch(() => {
                        showAlert(this.props.txt('Invalidation failed. Please try again.'), this.props.txt('Error'));
                    });
                } else {
                    showAlert(
                        this.props.txt('Please enable real-time update to use this feature.'),
                        this.props.txt('Real-time required')
                    );
                }
            });
            _defineProperty(this, "changeSort", e => {
                this.setState({ [e.target.name]: e.target.value });
            });
            _defineProperty(this, "compareValues", (key, order = 'asc') => {
                return function innerSort(a, b) {
                    if (!Object.prototype.hasOwnProperty.call(a, key) || !Object.prototype.hasOwnProperty.call(b, key)) {
                        return 0;
                    }
                    const varA = typeof a[key] === 'string' ? a[key].toUpperCase() : a[key];
                    const varB = typeof b[key] === 'string' ? b[key].toUpperCase() : b[key];
                    let comparison = 0;
                    if (varA > varB) comparison = 1;
                    else if (varA < varB) comparison = -1;
                    return order === 'desc' ? comparison * -1 : comparison;
                };
            });
            _defineProperty(this, "onFilterChange", (e) => { // Stable handler reference avoids inline function re-creation on each render
                this.setSearchTerm(e.target.value);
            });

            this.doPagination = typeof props.perPageLimit === "number" && props.perPageLimit > 0;
            this.state = {
                currentPage: 1,
                searchTerm: props.searchTerm,
                refreshPagination: 0,
                sortBy: `last_used_timestamp`,
                sortDir: `desc`
            };
        }
        render() {
            if (!this.props.allow.fileList) {
                return null;
            }
            if (this.props.allFiles.length === 0) {
                return /*#__PURE__*/ React.createElement("p", {
                    dangerouslySetInnerHTML: {
                        __html: this.props.txt(
                            $t(`No files have been cached or you have <i>opcache.file_cache_only</i> turned on`)
                        )
                    }
                });
            }
            const { searchTerm, currentPage } = this.state;
            const offset = (currentPage - 1) * this.props.perPageLimit;
            const filesInSearch = searchTerm ? this.props.allFiles.filter(file => {
                return !(file.full_path.indexOf(searchTerm) === -1);
            }) : this.props.allFiles;
            filesInSearch.sort(this.compareValues(this.state.sortBy, this.state.sortDir));
            const filesInPage = this.doPagination ? filesInSearch.slice(offset, offset + this.props.perPageLimit) : filesInSearch;
            const allFilesTotal = this.props.allFiles.length;
            const showingTotal = filesInSearch.length;
            const showing = showingTotal !== allFilesTotal ? ", {1} showing due to filter '{2}'" : "";
            return /*#__PURE__*/ React.createElement("div", null,
                /*#__PURE__*/ React.createElement("form", { action: "#" },
                    /*#__PURE__*/ React.createElement("label", { htmlFor: "frmFilter" }, this.props.txt('Start typing to filter on script path')),
                    /*#__PURE__*/ React.createElement("br", null),
                    /*#__PURE__*/ React.createElement("input", {
                        type: "text",
                        name: "filter",
                        id: "frmFilter",
                        className: "file-filter admin__control-text",
                        onChange: this.onFilterChange
                    })
                ),
                /*#__PURE__*/ React.createElement("h3", null,
                    this.props.txt(`{0} files cached${showing}`, allFilesTotal, showingTotal, this.state.searchTerm)
                ),
                this.props.allow.invalidate && this.state.searchTerm && showingTotal !== allFilesTotal && /*#__PURE__*/ React.createElement("p", null,
                    /*#__PURE__*/ React.createElement("a", { href: "#", onClick: this.handleInvalidateAll }, this.props.txt('Invalidate all matching files'))
                ),
                /*#__PURE__*/ React.createElement("div", { className: "paginate-filter" },
                    this.doPagination && /*#__PURE__*/ React.createElement(Pagination, {
                        totalRecords: filesInSearch.length,
                        pageLimit: this.props.perPageLimit,
                        pageNeighbours: 2,
                        onPageChanged: this.onPageChanged,
                        refresh: this.state.refreshPagination,
                        txt: this.props.txt
                    }),
                    /*#__PURE__*/ React.createElement("nav", { className: "filter", "aria-label": this.props.txt('Sort order') },
                        /*#__PURE__*/ React.createElement("select", { name: "sortBy", className: "admin__control-select", onChange: this.changeSort, value: this.state.sortBy },
                            /*#__PURE__*/ React.createElement("option", { value: "last_used_timestamp" }, this.props.txt('Last used')),
                            /*#__PURE__*/ React.createElement("option", { value: "last_modified" }, this.props.txt('Last modified')),
                            /*#__PURE__*/ React.createElement("option", { value: "full_path" }, this.props.txt('Path')),
                            /*#__PURE__*/ React.createElement("option", { value: "hits" }, this.props.txt('Number of hits')),
                            /*#__PURE__*/ React.createElement("option", { value: "memory_consumption" }, this.props.txt('Memory consumption'))
                        ),
                        /*#__PURE__*/ React.createElement("select", { name: "sortDir", className: "admin__control-select", onChange: this.changeSort, value: this.state.sortDir },
                            /*#__PURE__*/ React.createElement("option", { value: "desc" }, this.props.txt('Descending')),
                            /*#__PURE__*/ React.createElement("option", { value: "asc" }, this.props.txt('Ascending'))
                        )
                    )
                ),
                /*#__PURE__*/ React.createElement("table", { className: "tables cached-list-table" },
                    /*#__PURE__*/ React.createElement("thead", null, /*#__PURE__*/ React.createElement("tr", null, /*#__PURE__*/ React.createElement("th", null, this.props.txt('Script')))),
                    /*#__PURE__*/ React.createElement("tbody", null,
                        filesInPage.map((file) => {
                            return /*#__PURE__*/ React.createElement(CachedFile, _extends({
                                key: file.full_path,
                                canInvalidate: this.props.allow.invalidate,
                                realtime: this.props.realtime,
                                txt: this.props.txt,
                                api: this.props.api
                            }, file));
                        })
                    )
                )
            );
        }
    }

    class CachedFile extends React.Component {
        constructor(...args) {
            super(...args);
            _defineProperty(this, "handleInvalidate", e => {
                e.preventDefault();
                if (this.props.realtime) {
                    axios.get(this.props.api.stateUrl, {
                        params: {
                            action: 'invalidate',
                            file: e.currentTarget.getAttribute('data-file'),
                            form_key: window.FORM_KEY
                        }
                    })
                    .then(response => {
                        showAlert(
                            response.data && response.data.success
                                ? this.props.txt('File invalidation requested.')
                                : this.props.txt('File invalidation failed.'),
                            response.data && response.data.success ? null : this.props.txt('Error')
                        );
                    })
                    .catch(() => {
                        showAlert(this.props.txt('File invalidation failed. Please try again.'), this.props.txt('Error'));
                    });
                } else {
                    showAlert(
                        this.props.txt('Please enable real-time update to use this feature.'),
                        this.props.txt('Real-time required')
                    );
                }
            });
        }
        render() {
            return /*#__PURE__*/ React.createElement("tr", { "data-path": this.props.full_path.toLowerCase() },
                /*#__PURE__*/ React.createElement("td", null,
                    /*#__PURE__*/ React.createElement("span", { className: "file-pathname" }, this.props.full_path),
                    /*#__PURE__*/ React.createElement("span", { className: "file-metainfo" },
                        /*#__PURE__*/ React.createElement("b", null, this.props.txt('hits'), ": "), /*#__PURE__*/ React.createElement("span", null, this.props.readable.hits, ", "),
                        /*#__PURE__*/ React.createElement("b", null, this.props.txt('memory'), ": "), /*#__PURE__*/ React.createElement("span", null, this.props.readable.memory_consumption, ", "),
                        this.props.last_modified && /*#__PURE__*/ React.createElement(React.Fragment, null,
                            /*#__PURE__*/ React.createElement("b", null, this.props.txt('last modified'), ": "), /*#__PURE__*/ React.createElement("span", null, this.props.last_modified, ", ")
                        ),
                        /*#__PURE__*/ React.createElement("b", null, this.props.txt('last used'), ": "), /*#__PURE__*/ React.createElement("span", null, this.props.last_used)
                    ),
                    !this.props.timestamp && /*#__PURE__*/ React.createElement("span", { className: "invalid file-metainfo" }, " - ", this.props.txt('has been invalidated')),
                    this.props.canInvalidate && /*#__PURE__*/ React.createElement("span", null, ",\u00A0",
                        /*#__PURE__*/ React.createElement("a", {
                            className: "file-metainfo",
                            href: '?invalidate=' + this.props.full_path,
                            "data-file": this.props.full_path,
                            onClick: this.handleInvalidate
                        }, this.props.txt('force file invalidation'))
                    )
                )
            );
        }
    }

    class IgnoredFiles extends React.Component {
        constructor(props) {
            super(props);
            _defineProperty(this, "onPageChanged", currentPage => {
                this.setState({ currentPage });
            });
            this.doPagination = typeof props.perPageLimit === "number" && props.perPageLimit > 0;
            this.state = { currentPage: 1, refreshPagination: 0 };
        }
        render() {
            if (!this.props.allow.fileList) return null;
            if (this.props.allFiles.length === 0) {
                return /*#__PURE__*/ React.createElement("p", null, this.props.txt('No files have been ignored via <i>opcache.blacklist_filename</i>'));
            }
            const { currentPage } = this.state;
            const offset = (currentPage - 1) * this.props.perPageLimit;
            const filesInPage = this.doPagination ? this.props.allFiles.slice(offset, offset + this.props.perPageLimit) : this.props.allFiles;
            const allFilesTotal = this.props.allFiles.length;
            return /*#__PURE__*/ React.createElement("div", null,
                /*#__PURE__*/ React.createElement("h3", null, this.props.txt('{0} ignore file locations', allFilesTotal)),
                this.doPagination && /*#__PURE__*/ React.createElement(Pagination, {
                    totalRecords: allFilesTotal,
                    pageLimit: this.props.perPageLimit,
                    pageNeighbours: 2,
                    onPageChanged: this.onPageChanged,
                    refresh: this.state.refreshPagination,
                    txt: this.props.txt
                }),
                /*#__PURE__*/ React.createElement("table", { className: "tables ignored-list-table" },
                    /*#__PURE__*/ React.createElement("thead", null, /*#__PURE__*/ React.createElement("tr", null, /*#__PURE__*/ React.createElement("th", null, this.props.txt('Path')))),
                    /*#__PURE__*/ React.createElement("tbody", null,
                        filesInPage.map((file) => {
                            return /*#__PURE__*/ React.createElement("tr", { key: file },
                                /*#__PURE__*/ React.createElement("td", null, file)
                            );
                        })
                    )
                )
            );
        }
    }

    class PreloadedFiles extends React.Component {
        constructor(props) {
            super(props);
            _defineProperty(this, "onPageChanged", currentPage => {
                this.setState({ currentPage });
            });
            this.doPagination = typeof props.perPageLimit === "number" && props.perPageLimit > 0;
            this.state = { currentPage: 1, refreshPagination: 0 };
        }
        render() {
            if (!this.props.allow.fileList) return null;
            if (this.props.allFiles.length === 0) {
                return /*#__PURE__*/ React.createElement("p", null, this.props.txt('No files have been preloaded <i>opcache.preload</i>'));
            }
            const { currentPage } = this.state;
            const offset = (currentPage - 1) * this.props.perPageLimit;
            const filesInPage = this.doPagination ? this.props.allFiles.slice(offset, offset + this.props.perPageLimit) : this.props.allFiles;
            const allFilesTotal = this.props.allFiles.length;
            return /*#__PURE__*/ React.createElement("div", null,
                /*#__PURE__*/ React.createElement("h3", null, this.props.txt('{0} preloaded files', allFilesTotal)),
                this.doPagination && /*#__PURE__*/ React.createElement(Pagination, {
                    totalRecords: allFilesTotal,
                    pageLimit: this.props.perPageLimit,
                    pageNeighbours: 2,
                    onPageChanged: this.onPageChanged,
                    refresh: this.state.refreshPagination,
                    txt: this.props.txt
                }),
                /*#__PURE__*/ React.createElement("table", { className: "tables preload-list-table" },
                    /*#__PURE__*/ React.createElement("thead", null, /*#__PURE__*/ React.createElement("tr", null, /*#__PURE__*/ React.createElement("th", null, this.props.txt('Path')))),
                    /*#__PURE__*/ React.createElement("tbody", null,
                        filesInPage.map((file) => {
                            return /*#__PURE__*/ React.createElement("tr", { key: file },
                                /*#__PURE__*/ React.createElement("td", null, file)
                            );
                        })
                    )
                )
            );
        }
    }

    class Pagination extends React.Component {
        constructor(props) {
            super(props);
            _defineProperty(this, "gotoPage", page => {
                const { onPageChanged = f => f } = this.props;
                const currentPage = Math.max(0, Math.min(page, this.totalPages()));
                if (currentPage === this.state.currentPage) return; // Avoid unnecessary setState when page unchanged
                this.setState({ currentPage }, () => onPageChanged(currentPage));
            });
            _defineProperty(this, "totalPages", () => {
                return Math.ceil(this.props.totalRecords / this.props.pageLimit);
            });
            _defineProperty(this, "handleClick", (page, evt) => {
                evt.preventDefault();
                this.gotoPage(page);
            });
            _defineProperty(this, "handleJumpLeft", evt => {
                evt.preventDefault();
                this.gotoPage(this.state.currentPage - this.pageNeighbours * 2 - 1);
            });
            _defineProperty(this, "handleJumpRight", evt => {
                evt.preventDefault();
                this.gotoPage(this.state.currentPage + this.pageNeighbours * 2 + 1);
            });
            _defineProperty(this, "handleMoveLeft", evt => {
                evt.preventDefault();
                this.gotoPage(this.state.currentPage - 1);
            });
            _defineProperty(this, "handleMoveRight", evt => {
                evt.preventDefault();
                this.gotoPage(this.state.currentPage + 1);
            });
            _defineProperty(this, "range", (from, to, step = 1) => {
                let i = from;
                const range = [];
                while (i <= to) {
                    range.push(i);
                    i += step;
                }
                return range;
            });
            _defineProperty(this, "fetchPageNumbers", () => {
                const totalPages = this.totalPages();
                const pageNeighbours = this.pageNeighbours;
                const totalNumbers = this.pageNeighbours * 2 + 3;
                const totalBlocks = totalNumbers + 2;
                if (totalPages > totalBlocks) {
                    let pages = [];
                    const leftBound = this.state.currentPage - pageNeighbours;
                    const rightBound = this.state.currentPage + pageNeighbours;
                    const beforeLastPage = totalPages - 1;
                    const startPage = leftBound > 2 ? leftBound : 2;
                    const endPage = rightBound < beforeLastPage ? rightBound : beforeLastPage;
                    pages = this.range(startPage, endPage);
                    const pagesCount = pages.length;
                    const singleSpillOffset = totalNumbers - pagesCount - 1;
                    const leftSpill = startPage > 2;
                    const rightSpill = endPage < beforeLastPage;
                    const leftSpillPage = "LEFT";
                    const rightSpillPage = "RIGHT";
                    if (leftSpill && !rightSpill) {
                        const extraPages = this.range(startPage - singleSpillOffset, startPage - 1);
                        pages = [leftSpillPage, ...extraPages, ...pages];
                    } else if (!leftSpill && rightSpill) {
                        const extraPages = this.range(endPage + 1, endPage + singleSpillOffset);
                        pages = [...pages, ...extraPages, rightSpillPage];
                    } else if (leftSpill && rightSpill) {
                        pages = [leftSpillPage, ...pages, rightSpillPage];
                    }
                    return [1, ...pages, totalPages];
                }
                return this.range(1, totalPages);
            });
            this.state = { currentPage: 1 };
            this.pageNeighbours = typeof props.pageNeighbours === "number" ? Math.max(0, Math.min(props.pageNeighbours, 2)) : 0;
        }
        componentDidMount() {
            this.gotoPage(1);
        }
        componentDidUpdate(props) {
            const { refresh } = this.props;
            if (props.refresh !== refresh) {
                this.gotoPage(1);
            }
        }
        render() {
            if (!this.props.totalRecords || this.totalPages() === 1) {
                return null;
            }
            const { currentPage } = this.state;
            const pages = this.fetchPageNumbers();
            return /*#__PURE__*/ React.createElement("nav", { "aria-label": "File list pagination" },
                /*#__PURE__*/ React.createElement("ul", { className: "pagination" },
                    pages.map((page, index) => {
                        if (page === "LEFT") {
                            return /*#__PURE__*/ React.createElement(React.Fragment, { key: index },
                                /*#__PURE__*/ React.createElement("li", { className: "page-item arrow" },
                                    /*#__PURE__*/ React.createElement("a", {
                                        className: "page-link",
                                        href: "#",
                                        "aria-label": this.props.txt('Previous'),
                                        onClick: this.handleJumpLeft
                                    },
                                        /*#__PURE__*/ React.createElement("span", { "aria-hidden": "true" }, "\u219E"),
                                        /*#__PURE__*/ React.createElement("span", { className: "sr-only" }, this.props.txt('Jump back'))
                                    )
                                ),
                                /*#__PURE__*/ React.createElement("li", { className: "page-item arrow" },
                                    /*#__PURE__*/ React.createElement("a", {
                                        className: "page-link",
                                        href: "#",
                                        "aria-label": this.props.txt('Previous'),
                                        onClick: this.handleMoveLeft
                                    },
                                        /*#__PURE__*/ React.createElement("span", { "aria-hidden": "true" }, "\u21E0"),
                                        /*#__PURE__*/ React.createElement("span", { className: "sr-only" }, this.props.txt('Previous page'))
                                    )
                                )
                            );
                        }
                        if (page === "RIGHT") {
                            return /*#__PURE__*/ React.createElement(React.Fragment, { key: index },
                                /*#__PURE__*/ React.createElement("li", { className: "page-item arrow" },
                                    /*#__PURE__*/ React.createElement("a", {
                                        className: "page-link",
                                        href: "#",
                                        "aria-label": this.props.txt('Next'),
                                        onClick: this.handleMoveRight
                                    },
                                        /*#__PURE__*/ React.createElement("span", { "aria-hidden": "true" }, "\u21E2"),
                                        /*#__PURE__*/ React.createElement("span", { className: "sr-only" }, this.props.txt('Next page'))
                                    )
                                ),
                                /*#__PURE__*/ React.createElement("li", { className: "page-item arrow" },
                                    /*#__PURE__*/ React.createElement("a", {
                                        className: "page-link",
                                        href: "#",
                                        "aria-label": this.props.txt('Next'),
                                        onClick: this.handleJumpRight
                                    },
                                        /*#__PURE__*/ React.createElement("span", { "aria-hidden": "true" }, "\u21A0"),
                                        /*#__PURE__*/ React.createElement("span", { className: "sr-only" }, this.props.txt('Jump forward'))
                                    )
                                )
                            );
                        }
                        return /*#__PURE__*/ React.createElement("li", { key: index, className: "page-item" },
                            /*#__PURE__*/ React.createElement("a", {
                                className: `page-link${currentPage === page ? " active" : ""}`,
                                href: "#",
                                onClick: e => this.handleClick(page, e)
                            }, page)
                        );
                    })
                )
            );
        }
    }

    function Footer(props) {
        return /*#__PURE__*/ React.createElement("footer", { className: "main-footer" },
            /*#__PURE__*/ React.createElement("a", {
                className: "github-link",
                href: "https://github.com/amnuts/opcache-gui",
                target: "_blank",
                title: props.txt("opcache-gui (currently version {0}) on GitHub", props.version)
            }, "https://github.com/amnuts/opcache-gui - ", props.txt("version {0}", props.version)),
            /*#__PURE__*/ React.createElement("a", {
                className: "sponsor-link",
                href: "https://github.com/sponsors/amnuts",
                target: "_blank",
                title: props.txt("Sponsor this project and author on GitHub")
            }, props.txt("Sponsor this project"))
        );
    }

    function debounce(func, wait, immediate) {
        let timeout;
        wait = wait || 250;
        return function() {
            let context = this,
                args = arguments;
            let later = function() {
                timeout = null;
                if (!immediate) {
                    func.apply(context, args);
                }
            };
            let callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) {
                func.apply(context, args);
            }
        };
    }

    return function bootstrap(opcacheOptions) {
        const root = ReactDOMClient.createRoot(document.getElementById('interface'));
        root.render(React.createElement(Interface, opcacheOptions));
    };
});