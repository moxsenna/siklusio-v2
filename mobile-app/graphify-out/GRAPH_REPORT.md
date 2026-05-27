# Graph Report - mobile-app  (2026-05-28)

## Corpus Check
- 70 files · ~121,018 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2001 nodes · 5326 edges · 95 communities (74 shown, 21 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b6f3230b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]

## God Nodes (most connected - your core abstractions)
1. `s` - 179 edges
2. `t` - 146 edges
3. `n` - 141 edges
4. `c` - 140 edges
5. `u()` - 129 edges
6. `f()` - 126 edges
7. `o()` - 123 edges
8. `a()` - 114 edges
9. `l()` - 90 edges
10. `h()` - 86 edges

## Surprising Connections (you probably didn't know these)
- `escapeCsvCell()` --calls--> `string()`  [INFERRED]
  app/admin.tsx → .expo/audit-export/_expo/static/js/web/entry-79aede259881aaeffeb015697aba664c.js
- `translateError()` --calls--> `string()`  [INFERRED]
  src/hooks/useCommunityFeed.ts → .expo/audit-export/_expo/static/js/web/entry-79aede259881aaeffeb015697aba664c.js
- `CalendarScreen()` --calls--> `useCycle()`  [EXTRACTED]
  app/(tabs)/calendar.tsx → src/context/CycleContext.tsx
- `HabitsScreen()` --calls--> `useCycle()`  [EXTRACTED]
  app/(tabs)/habits.tsx → src/context/CycleContext.tsx
- `AuthScreen()` --calls--> `useAuth()`  [EXTRACTED]
  app/auth.tsx → src/context/AuthContext.tsx

## Communities (95 total, 21 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.16
Nodes (15): AiReportModal(), AiReportModalProps, CalendarGrid(), CalendarGridProps, CycleContext, CycleContextType, CycleProvider(), usePersistentState() (+7 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (25): CommentsModal(), CommentsModalProps, ComposerModal(), ComposerModalProps, PHASE_OPTIONS, PostCard(), PostCardProps, COMMON_REASONS (+17 more)

### Community 2 - "Community 2"
Cohesion: 0.16
Nodes (12): styles, styles, styles, ExternalLink(), MonoText(), Text(), TextProps, ThemeProps (+4 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (28): backgroundColor, foregroundImage, adaptiveIcon, edgeToEdgeEnabled, predictiveBackGestureEnabled, typedRoutes, expo, android (+20 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (41): dependencies, date-fns, expo, expo-av, expo-constants, expo-font, expo-image-picker, expo-linking (+33 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (18): AuthScreen(), IndexPage(), RootLayoutNav(), unstable_settings, useColorScheme(), AuthContext, AuthContextType, AuthProvider() (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.01
Nodes (190): [A,E], [A,M], [A,v], {addKeyedListener:c}, {addKeyedListener:s}, {addListener:s}, {addOptionsGetter:b}, {addOptionsGetter:d} (+182 more)

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (10): CustomDropdownProps, DropdownOption, OnboardingScreen(), DatePickerField(), DatePickerFieldProps, formatLong(), MONTHS_ID, NativeWheelDatePicker() (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.29
Nodes (6): compilerOptions, paths, strict, extends, include, @/*

### Community 9 - "Community 9"
Cohesion: 0.40
Nodes (4): editor.codeActionsOnSave, source.fixAll, source.organizeImports, source.sortMembers

### Community 10 - "Community 10"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, { withNativeWind }

### Community 23 - "Community 23"
Cohesion: 0.05
Nodes (63): ad(), addEventListener(), Ae(), af(), bf(), catch(), cn(), cr() (+55 more)

### Community 25 - "Community 25"
Cohesion: 0.09
Nodes (42): ao(), Ba(), cd(), co(), De(), Do(), eu(), fo() (+34 more)

### Community 28 - "Community 28"
Cohesion: 0.06
Nodes (6): backIndex(), emitChange(), eo(), measure(), n, Re()

### Community 29 - "Community 29"
Cohesion: 0.08
Nodes (4): deviceName(), enabled(), measureLayout(), o()

### Community 30 - "Community 30"
Cohesion: 0.06
Nodes (3): assert(), cancel(), h()

### Community 31 - "Community 31"
Cohesion: 0.07
Nodes (4): configureNextLayoutAnimation(), t, vibrate(), waitForSocketClosed()

### Community 32 - "Community 32"
Cohesion: 0.09
Nodes (25): cloneRequestState(), containedBy(), csv(), explain(), fu(), geojson(), getInitialState(), ilikeAnyOf() (+17 more)

### Community 33 - "Community 33"
Cohesion: 0.18
Nodes (32): ac(), bc(), cc(), Ce(), dc(), ec(), fc(), fd() (+24 more)

### Community 34 - "Community 34"
Cohesion: 0.06
Nodes (34): applyTransformOptsToQuery(), copy(), createBucket(), createIndex(), createSignedUploadUrl(), createSignedUrl(), createSignedUrls(), deleteBucket() (+26 more)

### Community 35 - "Community 35"
Cohesion: 0.18
Nodes (31): Al(), bu(), ci(), dl(), El(), fi(), fl(), Gu() (+23 more)

### Community 36 - "Community 36"
Cohesion: 0.08
Nodes (7): $(), addListener(), hasListeners(), __makeNative(), removeEventListener(), start(), _startListeningToNativeValueUpdates()

### Community 37 - "Community 37"
Cohesion: 0.11
Nodes (31): bl(), cl(), di(), ee(), ef(), gi(), Gr(), hf() (+23 more)

### Community 38 - "Community 38"
Cohesion: 0.09
Nodes (14): add(), addChangeListener(), clearInteractionHandle(), delete(), get(), is(), order(), remove() (+6 more)

### Community 39 - "Community 39"
Cohesion: 0.09
Nodes (17): cancelTasks(), cf(), create(), current(), filter(), g(), getRehydratedState(), getStateForAction() (+9 more)

### Community 40 - "Community 40"
Cohesion: 0.13
Nodes (4): c, fa(), ia(), su()

### Community 41 - "Community 41"
Cohesion: 0.07
Nodes (26): contains(), eq(), gt(), gte(), ilike(), ilikeAllOf(), isDistinct(), like() (+18 more)

### Community 42 - "Community 42"
Cohesion: 0.10
Nodes (11): computeBlankness(), deactivateAndFlush(), dispose(), enqueueTasks(), mapArrayTypeChildrenToProps(), mapChildrenToProps(), queryCache(), _resetData() (+3 more)

### Community 43 - "Community 43"
Cohesion: 0.13
Nodes (15): AdminModerationQueueRow, AdminUser, CommentRow, escapeCsvCell(), PostRow, ProfileRow, QueueItem, ReportRow (+7 more)

### Community 44 - "Community 44"
Cohesion: 0.11
Nodes (18): cancelRefEvent(), cancelTimeout(), destroy(), hasReceived(), inPendingSyncState(), isMember(), joinRef(), leave() (+10 more)

### Community 45 - "Community 45"
Cohesion: 0.11
Nodes (16): clearHeartbeats(), flushSendBuffer(), hasLogger(), heartbeatTimeout(), leaveOpenTopic(), onConnClose(), onConnError(), onConnOpen() (+8 more)

### Community 46 - "Community 46"
Cohesion: 0.11
Nodes (8): appendParams(), d(), e, endpointURL(), match(), protocol(), serialize(), vd()

### Community 47 - "Community 47"
Cohesion: 0.13
Nodes (3): i, q(), x()

### Community 49 - "Community 49"
Cohesion: 0.17
Nodes (14): useCycle(), ActionCard(), ActionCardProps, AffirmationCard(), CycleCard(), CycleCardProps, MessageModal(), MessageModalProps (+6 more)

### Community 50 - "Community 50"
Cohesion: 0.28
Nodes (16): ai(), bi(), ea(), ei(), es(), ki(), np(), ns() (+8 more)

### Community 51 - "Community 51"
Cohesion: 0.12
Nodes (4): __getNativeConfig(), __getNativeTag(), __getPlatformConfig(), __startNativeAnimation()

### Community 52 - "Community 52"
Cohesion: 0.15
Nodes (12): channel(), getChannels(), Le(), On(), onClose(), onError(), onMessage(), onOpen() (+4 more)

### Community 53 - "Community 53"
Cohesion: 0.16
Nodes (20): At(), bn(), er(), et(), ff(), Ht(), jn(), jt() (+12 more)

### Community 54 - "Community 54"
Cohesion: 0.12
Nodes (5): __getAnimatedValue(), __getChildren(), __getValue(), __onAnimatedValueUpdateReceived(), toJSON()

### Community 56 - "Community 56"
Cohesion: 0.13
Nodes (16): ajax(), batchSend(), createNamespace(), createNamespaceIfNotExists(), createTable(), createTableIfNotExists(), dropNamespace(), listNamespaces() (+8 more)

### Community 57 - "Community 57"
Cohesion: 0.12
Nodes (9): alert(), b(), _dispatchEvent(), focus(), focusTextInput(), init(), openAuthSessionAsync(), openBrowserAsync() (+1 more)

### Community 58 - "Community 58"
Cohesion: 0.13
Nodes (3): array(), ja(), V()

### Community 59 - "Community 59"
Cohesion: 0.09
Nodes (5): canPush(), isConnected(), onJoin(), onLeave(), onSync()

### Community 62 - "Community 62"
Cohesion: 0.18
Nodes (7): AiInsightResult, AiRecommendationSection(), Props, WeeklyDayData, HistoryView(), HabitsScreen(), HistoryErrorBoundary

### Community 63 - "Community 63"
Cohesion: 0.23
Nodes (10): AvatarPicker(), AvatarPickerProps, AvatarKind, getImgBBApiKey(), ImgBBError, ImgBBSuccess, PRESET_AVATARS, PresetAvatar (+2 more)

### Community 64 - "Community 64"
Cohesion: 0.17
Nodes (5): darken(), dismissAuthSession(), getInitialURL(), getStateForRouteFocus(), p()

### Community 65 - "Community 65"
Cohesion: 0.17
Nodes (6): enqueue(), _getCurrentQueue(), hasTasksToProcess(), parseJSON(), processNext(), processResponse()

### Community 66 - "Community 66"
Cohesion: 0.17
Nodes (10): binaryEncode(), computeViewableItems(), encode(), from(), In(), isHeadless(), notIn(), onUpdate() (+2 more)

### Community 68 - "Community 68"
Cohesion: 0.20
Nodes (8): ie, _initRealtimeClient(), _initSupabaseAuthClient(), J(), _listenForAuthEvents(), object(), setFocusedState(), unitObject()

### Community 69 - "Community 69"
Cohesion: 0.24
Nodes (5): translateError(), dropTable(), listBucketOptionsToQueryString(), string(), toString()

### Community 71 - "Community 71"
Cohesion: 0.29
Nodes (4): connect(), connectWithFallback(), transportConnect(), transportName()

### Community 73 - "Community 73"
Cohesion: 0.28
Nodes (9): Au(), ca(), du(), Iu(), Mr(), oc(), Ou(), Ru() (+1 more)

### Community 75 - "Community 75"
Cohesion: 0.13
Nodes (15): bd(), bo(), dd(), ep(), gd(), Ke(), nd(), od() (+7 more)

### Community 77 - "Community 77"
Cohesion: 0.25
Nodes (7): abort(), close(), closeAndRetry(), getSize(), load(), ontimeout(), replaceTransport()

### Community 80 - "Community 80"
Cohesion: 0.39
Nodes (8): ds(), fs(), hs(), ji(), ms(), ps(), qe(), wi()

### Community 81 - "Community 81"
Cohesion: 0.25
Nodes (3): fullBundleUrl(), makeRef(), maybeCompleteAuthSession()

### Community 82 - "Community 82"
Cohesion: 0.38
Nodes (6): binaryDecode(), decode(), decodeBroadcast(), decodePush(), decodeReply(), onConnMessage()

### Community 83 - "Community 83"
Cohesion: 0.33
Nodes (5): __getNativeAnimationConfig(), hex(), hexa(), percentString(), round()

### Community 84 - "Community 84"
Cohesion: 0.67
Nodes (6): as(), ls(), os(), rs(), ts(), us()

### Community 85 - "Community 85"
Cohesion: 0.50
Nodes (4): alpha(), fade(), mix(), opaquer()

### Community 88 - "Community 88"
Cohesion: 1.00
Nodes (3): clone(), syncDiff(), syncState()

### Community 89 - "Community 89"
Cohesion: 0.67
Nodes (3): contrast(), level(), luminosity()

## Knowledge Gaps
- **318 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+313 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `string()` connect `Community 69` to `Community 6`, `Community 23`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 34`, `Community 35`, `Community 36`, `Community 40`, `Community 43`, `Community 47`, `Community 48`, `Community 57`, `Community 64`, `Community 68`, `Community 83`?**
  _High betweenness centrality (0.138) - this node is a cross-community bridge._
- **Why does `s` connect `Community 24` to `Community 6`, `Community 22`, `Community 23`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 36`, `Community 38`, `Community 39`, `Community 40`, `Community 42`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 51`, `Community 52`, `Community 54`, `Community 55`, `Community 57`, `Community 58`, `Community 59`, `Community 60`, `Community 64`, `Community 65`, `Community 66`, `Community 67`, `Community 68`, `Community 70`, `Community 71`, `Community 72`, `Community 77`, `Community 78`, `Community 80`, `Community 81`, `Community 82`, `Community 83`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Why does `a()` connect `Community 22` to `Community 6`, `Community 23`, `Community 24`, `Community 25`, `Community 27`, `Community 28`, `Community 29`, `Community 31`, `Community 32`, `Community 33`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 42`, `Community 46`, `Community 47`, `Community 48`, `Community 50`, `Community 55`, `Community 57`, `Community 64`, `Community 68`, `Community 81`, `Community 83`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _318 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.10416666666666667 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._