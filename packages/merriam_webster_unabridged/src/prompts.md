# Instruction

I want you modify the given `index.ts` file according below requirement

1. Parsing the `example mdx dictionary html` information.
2. Reading schame.
3. Using the parsed `example mdx dictionary html` to fill the infomation the yomitan dictionary schame needed as much as possible.
    - you should use `structured-content` in the defintion field.
    - Don't for get add term tag.
    - Don't for get add definition tag.
    - Make sure the deinflect is working.
4. I also will provide you a artile about how to make yomitan dictionary called `making-yomitan-dictionaries.md`.
5. Also doesn't forget add a style sheet to make the dictionary beaufle.
6. consider the example may not inclue all the `String of space-separated rule identifiers for the definition which is used to validate deinflection. An empty string should be used for words which aren't inflected`. you should tell me where to add new identifiers.
7. consider the example may not inclue all the `String of space-separated rule identifiers for the definition which is used to validate deinflection. An empty string should be used for words which aren't inflected`. you should tell me where to add new identifiers.
8. Code requirement
   1. the code shoud be functional style code. NO OOP.
   2. the code should be consise, easy to read.
   3. Add explain where is needed.

## Example mdx dictionary html

### hello

```html
<link rel="stylesheet" href="mwu2024.css"><script type="text/javascript" src="mwu2024.js"></script><mwu><div class="search-toolbar"> <div class="also-found-in"> <div class="tabs"> <a class="selected" href="bword://hello">Unabridged Dictionary</a> <a class="unselected" href="bword://collegiate_hello">Collegiate Dictionary</a> <a class="unselected" href="bword://thesaurus_hello">Collegiate Thesaurus</a> </div></div></div><mean show="0"><div class="page-content"> <div class="well content-body definition-body"><div class="wordclick" data-word-click="enabled"> <div class="left-content col-xl-12"> <div class="row entry-header"> <div class="col-12"> <h1 class="hword"> <sup>1</sup> hel·lo</h1> <span class="fl">interjection</span> <span class="prs"> <span class="first-slash">\</span><span class="pr"> hə-ˈlō</span> <a class="play-pron hw-play-pron" data-lang="en_us" href="sound://h/hello001.mp3"><span class="audio-icon"></span></a><span class="addPunct">, </span><span class="pr"> he-ˈlō</span><span class="addPunct">, </span><span class="pr"> ˈhe-(ˌ)lō</span><span class="addPunct">, </span><span class="pr"> ˈhe-ˈlō</span><span class="pun">;</span><span class="pr"> <em class="mw_t_it">subject to wide intonational variation</em></span> <span class="last-slash">\</span> </span> </div></div> <div class="section" data-id="definition"> <div class="def-wrapper"> <div class="vg"> <div class="sb no-sn"> <span class="sb-0"> <div class="sense no-subnum"> <span class="dt "><span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used especially as a familiar greeting or in answering the telephone or to express surprise</span></span></span></span> </div> </span> </div> </div> </div> <div class="def-accordion-sections"> <div class="section custom-accordion" data-id="origin"> <h2 class="toggle"><span class="text">Origin of HELLO</span><span class="toggle-icon">[+]</span></h2> <div class="section-content etymology"> <div class="sub-well"> <p><span class="et">alteration of <em class="mw_t_it">hollo</em></span></p> </div> </div></div> </div> </div> </div> </div></div> </div></mean><mean show="1"><div class="page-content"> <div class="well content-body definition-body"><div class="wordclick" data-word-click="enabled"> <div class="left-content col-xl-12"> <div class="row entry-header"> <div class="col-12"> <h1 class="hword"> <sup>2</sup> hel·lo</h1> <span class="fl">intransitive verb</span> <span class="prs"> <span class="first-slash">\</span><span class="pr"> hə-ˈlō</span> <a class="play-pron hw-play-pron" data-lang="en_us" href="sound://h/hello001.mp3"><span class="audio-icon"></span></a><span class="addPunct">, </span><span class="pr"> he-ˈlō</span><span class="addPunct">, </span><span class="pr"> ˈhe-(ˌ)lō</span> <span class="last-slash">\</span> </span> </div></div> <div class="row headword-row"> <div class="col"> <span class="vg-ins"> <em>inflected form(s): </em> <span class="ix">-ed/-ing/-s</span> </span> </div> </div> <div class="section" data-id="definition"> <div class="def-wrapper"> <div class="vg"> <div class="sb no-sn"> <span class="sb-0"> <div class="sense no-subnum"> <span class="dt "><strong class="mw_t_bc">: </strong>to call or say hello</span> </div> </span> </div> </div> </div> <div class="def-accordion-sections"> </div> </div> </div> </div></div> </div></mean><mean show="2"><div class="page-content"> <div class="well content-body definition-body"><div class="wordclick" data-word-click="enabled"> <div class="left-content col-xl-12"> <div class="row entry-header"> <div class="col-12"> <h1 class="hword"> <sup>3</sup> hel·lo</h1> <span class="fl">noun</span> <span class="prs"> <span class="first-slash">\</span><span class="pr"> hə-ˈlō</span> <a class="play-pron hw-play-pron" data-lang="en_us" href="sound://h/hello001.mp3"><span class="audio-icon"></span></a><span class="addPunct">, </span><span class="pr"> he-ˈlō</span><span class="addPunct">, </span><span class="pr"> ˈhe-(ˌ)lō</span> <span class="last-slash">\</span> </span> </div></div> <div class="row headword-row"> <div class="col"> <span class="vg-ins"> <em>inflected form(s): </em> <span class="il plural"> plural </span><span class="ix">-s</span> </span> </div> </div> <div class="section" data-id="definition"> <div class="def-wrapper"> <div class="vg"> <div class="sb no-sn"> <span class="sb-0"> <div class="sense no-subnum"> <span class="dt "><strong class="mw_t_bc">: </strong>an expression or gesture of greeting <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ just dropped in to say <span class="mw_t_wi">hello</span></span></span><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">→ never failed to wave a cheery <span class="mw_t_wi">hello</span> as he passed</span></span></span> </div> </span> </div> </div> </div> <div class="def-accordion-sections"> <div class="section custom-accordion" data-id="origin"> <h2 class="toggle"><span class="text">Origin of HELLO</span><span class="toggle-icon">[+]</span></h2> <div class="section-content etymology"> <div class="sub-well"> <p>First Known Use: 1877 </p> </div> </div></div> </div> </div> </div> </div></div> </div></mean></mwu>
```

### count

```html
<link rel="stylesheet" href="mwu2024.css"><script type="text/javascript" src="mwu2024.js"></script><mwu><div class="search-toolbar"> <div class="also-found-in">	<div class="tabs">	 	<a class="selected" href="bword://count">Unabridged Dictionary</a>	 	<a class="unselected" href="bword://collegiate_count">Collegiate Dictionary</a>	 	<a class="unselected" href="bword://thesaurus_count">Collegiate Thesaurus</a>	 	<a class="unselected" href="bword://medical_count">Medical Dictionary</a>	</div></div></div><mean show="0"><div class="page-content">  <div class="well content-body definition-body"><div class="wordclick" data-word-click="enabled"> <div class="left-content col-xl-12"> <div class="row entry-header"> <div class="col-12"> <h1 class="hword"> <sup>1</sup> count</h1>  <span class="fl">verb</span> <span class="prs"> <span class="first-slash">\</span><span class="pr"> ˈkau̇nt</span> <a class="play-pron hw-play-pron" data-lang="en_us" href="sound://c/count001.mp3"><span class="audio-icon"></span></a><span class="addPunct">, </span><span class="pr"> <em class="mw_t_it">dialectally</em> ˈkyau̇nt</span> <span class="last-slash">\</span> </span> </div></div> <div class="row headword-row"> <div class="col"> <span class="vg-ins"> <em>inflected form(s): </em> <span class="ix">-ed/-ing/-s</span> </span> </div> </div> <div class="section" data-id="definition"> <div class="def-wrapper"> <div class="vg">  <p class="vd firstVd"><em>transitive verb</em></p> <div class="sb has-num has-let has-subnum"> <span class="sb-0"> <div class="sense has-sn"> <span class="sn sense-1 a"><span class="num">1</span><span class="letter">a</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>to indicate, name, or separate (units out of a body of units) one by one or group after group to find the total number of units involved or concerned <strong class="mw_t_bc">: </strong><a href="bword://number" class="mw_t_sx"><span class="text-uppercase">number</span></a>, <a href="bword://tally" class="mw_t_sx"><span class="text-uppercase">tally</span></a>, <a href="bword://reckon" class="mw_t_sx"><span class="text-uppercase">reckon</span></a> <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ <span class="mw_t_sp"><span class="mw_t_wi">count</span> the pages of a manuscript</span></span></span><span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">sometimes used with <em class="mw_t_it">up</em> or <em class="mw_t_it">over</em><span class="vis"> <span class="vi"><span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ <span class="mw_t_sp"><span class="mw_t_wi">count</span> up the money in the register</span></span></span></span></span></span></span> </span></span></div> </span> <span class="sb-1"> <div class="sense has-sn"> <span class="sn sense-b"><span class="letter">b</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>to tell over or name the numbers in regular order up to and including (a specified number) <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ <span class="mw_t_sp"><span class="mw_t_wi">count</span> ten before answering</span></span></span></span> </div> </span> <span class="sb-2"> <div class="sense has-sn"> <span class="sn sense-c"><span class="letter">c</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>to include in a tallying and reckoning <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ <span class="mw_t_sp"><span class="mw_t_wi">counting</span> the hosts, there were 20 people present at the dinner party</span></span></span></span> </div> </span> <span class="sb-3"> <div class="sense has-sn"> <span class="sn sense-d"><span class="letter">d</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>to compute or tally mechanically and record a total <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ a machine that <span class="mw_t_wi">counts</span> cars crossing the bridge</span></span></span> </div> </span> <span class="sb-4"> <div class="sense has-sn"> <span class="sn sense-e"><span class="letter">e</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>to call aloud (beats or time units) especially in the practicing of a musical composition <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ <span class="mw_t_sp"><span class="mw_t_wi">count</span> eighth notes</span></span></span></span> </div> </span> <span class="sb-5"> <div class="pseq no-subnum"> <div class="sense has-sn has-subnum"> <span class="sn sense-f (1)"><span class="letter">f</span><span class="sub-num">(1)</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>to recollect or keep track of the number of cards that have been played in (a specified suit) <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ <span class="mw_t_sp"><span class="mw_t_wi">count</span> trumps</span></span></span></span> </div> <div class="sense has-sn has-subnum"> <span class="sn sense-(2)"><span class="sub-num">(2)</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>to estimate or mentally reconstruct the distribution of cards in (another player's hand)</span> </div> <div class="sense has-sn has-subnum"> <span class="sn sense-(3)"><span class="sub-num">(3)</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>to count the points in (a hand of cards) <span class="dx-jump"> — compare <a href="bword://point count" class="mw_t_dxt"><span class="text-uppercase">point count</span></a></span></span> </div> </div> </span> </div> <div class="sb has-num has-let"> <span class="sb-0"> <div class="sense has-sn"> <span class="sn sense-2 a"><span class="num">2</span><span class="letter">a</span></span> <span class="dt "><strong class="mw_t_bc">: </strong><a href="bword://consider" class="mw_t_sx"><span class="text-uppercase">consider</span></a>, <a href="bword://account" class="mw_t_sx"><span class="text-uppercase">account</span></a>, <a href="bword://regard" class="mw_t_sx"><span class="text-uppercase">regard</span></a>, <a href="bword://judge" class="mw_t_sx"><span class="text-uppercase">judge</span></a> <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ <span class="mw_t_sp"><span class="mw_t_wi">count</span> oneself lucky</span></span></span><span class="ex-sent-group"> <span class="ex-sent t has-aq sents sents-block">→ the true dignity of man … is <span class="mw_t_wi">counted</span> folly</span><span class="ex-sent aq has-aq sents"><span class="aq"><span class="auth"> — W. E. Channing</span></span></span></span></span> </div> </span> <span class="sb-1"> <div class="sense has-sn"> <span class="sn sense-b"><span class="letter">b</span></span> <span class="dt "><strong class="mw_t_bc">: </strong><a href="bword://estimate" class="mw_t_sx"><span class="text-uppercase">estimate</span></a>, <a href="bword://esteem" class="mw_t_sx"><span class="text-uppercase">esteem</span></a> <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ he <span class="mw_t_wi">counted</span> it nothing that his follower had sacrificed his life</span></span></span> </div> </span> <span class="sb-2"> <div class="sense has-sn"> <span class="sn sense-c"><span class="letter">c</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>to record as of a particular opinion or persuasion <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ <span class="mw_t_sp"><span class="mw_t_wi">count</span> me as uncommitted</span></span></span><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">→ stand and be <span class="mw_t_wi">counted</span></span></span></span> </div> </span> <span class="sb-3"> <div class="sense has-sn"> <span class="sn sense-d"><span class="letter">d</span></span> <span class="sl">dialectal </span>  <span class="dt "><strong class="mw_t_bc">: </strong><a href="bword://suppose" class="mw_t_sx"><span class="text-uppercase">suppose</span></a>, <a href="bword://guess" class="mw_t_sx"><span class="text-uppercase">guess</span></a>, <a href="bword://reckon" class="mw_t_sx"><span class="text-uppercase">reckon</span></a> <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ I <span class="mw_t_wi">count</span> there's three of them coming</span></span></span> </div> </span> </div> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-3"><span class="num">3</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>to amount to <strong class="mw_t_bc">: </strong>have a total of <span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">→ they <span class="mw_t_wi">counted</span> 30</span><span class="ex-sent aq has-aq sents"><span class="aq"><span class="auth"> — Lord Byron</span></span></span></span></span> </div> </span> </div> </div> <div class="vg">  <p class="vd"><em>intransitive verb</em></p> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-1"><span class="num">1</span></span> <span class="sl">archaic </span>  <span class="dt "><strong class="mw_t_bc">: </strong>to think much of something <strong class="mw_t_bc">: </strong>care about something <strong class="mw_t_bc">: </strong>take account <span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">→ no man <span class="mw_t_wi">counts</span> of her beauty</span><span class="ex-sent aq has-aq sents"><span class="aq"><span class="auth"> — Shakespeare</span></span></span></span></span> </div> </span> </div> <div class="sb has-num has-let"> <span class="sb-0"> <div class="sense has-sn"> <span class="sn sense-2 a"><span class="num">2</span><span class="letter">a</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>to recite or indicate the numbers in order <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ a little child who could not <span class="mw_t_wi">count</span></span></span><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">→ <span class="mw_t_sp"><span class="mw_t_wi">count</span> by fives</span></span></span> <strong class="mw_t_bc">: </strong>count the units in a group <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ interrupted while he was <span class="mw_t_wi">counting</span></span></span></span> </div> </span> <span class="sb-1"> <div class="sense has-sn"> <span class="sn sense-b"><span class="letter">b</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>to mark the time by counting aloud the beats in a musical composition</span> </div> </span> </div> <div class="sb has-num has-let"> <span class="sb-0"> <div class="sense has-sn"> <span class="sn sense-3 a"><span class="num">3</span><span class="letter">a</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>to rely or depend on someone or something in plans or calculations <span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used with <em class="mw_t_it">on</em> or <em class="mw_t_it">upon</em><span class="vis"> <span class="vi"><span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">→ the man they <span class="mw_t_wi">counted</span> on in this crisis</span><span class="ex-sent aq has-aq sents"><span class="aq"><span class="auth"> — Stuart Cloete</span></span></span></span></span></span></span> <strong class="mw_t_bc">: </strong>look forward to, expect, or plan on something with assured confidence <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ <span class="mw_t_sp"><span class="mw_t_wi">count</span> on clear weather</span></span></span><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">→ <span class="mw_t_sp"><span class="mw_t_wi">counting</span> on his car to get him there on time</span></span></span></span> </span></span></div> </span> <span class="sb-1"> <div class="sense has-sn"> <span class="sn sense-b"><span class="letter">b</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>to expect, predict, or take something into consideration <span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">usually used with <em class="mw_t_it">on</em><span class="vis"> <span class="vi"><span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ they <span class="mw_t_wi">count</span> on winning</span></span></span><span class="vi"><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">→ he had not <span class="mw_t_wi">counted</span> on paying and had brought no money</span></span></span></span></span></span> </span></span></div> </span> </div> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-4"><span class="num">4</span></span> <span class="sl">English law</span>, <span class="sl">obsolete </span>  <span class="dt "><strong class="mw_t_bc">: </strong>to plead in court <strong class="mw_t_bc">: </strong>state a complaint in court</span> </div> </span> </div> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-5"><span class="num">5</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>to add up <strong class="mw_t_bc">: </strong>amount in number <strong class="mw_t_bc">: </strong><a href="bword://total" class="mw_t_sx"><span class="text-uppercase">total</span></a> <span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">sometimes used with <em class="mw_t_it">up</em><span class="vis"> <span class="vi"><span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ it <span class="mw_t_wi">counts</span> up to a sizable sum</span></span></span></span></span></span> </span></span></div> </span> </div> <div class="sb has-num has-let"> <span class="sb-0"> <div class="sense has-sn"> <span class="sn sense-6 a"><span class="num">6</span><span class="letter">a</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>to have value, meaning, weight, significance, or importance <span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">→ landscape <span class="mw_t_wi">counts</span> in the character of a place, but people <span class="mw_t_wi">count</span> more</span><span class="ex-sent aq has-aq sents"><span class="aq"><span class="auth"> — H. L. Davis</span></span></span></span> <strong class="mw_t_bc">: </strong>merit consideration <strong class="mw_t_bc">: </strong>be of consequence or account <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ these are the men who really <span class="mw_t_wi">count</span></span></span></span> </div> </span> <span class="sb-1"> <div class="sense has-sn"> <span class="sn sense-b"><span class="letter">b</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>to be of account <strong class="mw_t_bc">: </strong>have status or rank <strong class="mw_t_bc">: </strong>become classed or regarded <span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">→ achievements such as the TVA have <span class="mw_t_wi">counted</span> for far more … than our military power</span><span class="ex-sent aq has-aq sents"><span class="aq"><span class="auth"> — M. W. Straight</span></span></span></span><span class="ex-sent-group"> <span class="ex-sent t has-aq sents sents-block">→ the things that <span class="mw_t_wi">counted</span> so much with us when we were young</span><span class="ex-sent aq has-aq sents"><span class="aq"><span class="auth"> — Louis Bromfield</span></span></span></span></span> </div> </span> </div> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-7"><span class="num">7</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>to make a score <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ <span class="mw_t_sp"><span class="mw_t_wi">counted</span> twice in the third inning</span></span></span></span> </div> </span> </div> </div> </div> <div class="dro"> <span id="count-coup-anchor" class="drp">count coup</span> <div class="vg">  <div class="sls"> <span class="sl">of an American Indian </span> </div>  <div class="sb no-sn"> <span class="sb-0"> <div class="sense no-subnum"> <span class="dt hasSdSense"><strong class="mw_t_bc">: </strong>to make a coup</span> <span class="sdsense"> <span class="sd">also</span> <strong class="mw_t_bc">: </strong>to relate the story of one's coups </span> </div> </span> </div> </div> <span id="count-heads-anchor" class="drp">count heads</span> <span class="vr"><span class="vl"> or </span><span id="count-noses-anchor" class="va">count noses</span></span> <div class="vg"> <div class="sb no-sn"> <span class="sb-0"> <div class="sense no-subnum"> <span class="dt "><strong class="mw_t_bc">: </strong>to count the number (as of persons) present</span> </div> </span> </div> </div> </div> <div class="def-accordion-sections"> <div class="section custom-accordion" data-id="origin"> <h2 class="toggle"><span class="text">Origin of COUNT</span><span class="toggle-icon">[+]</span></h2> <div class="section-content etymology"> <div class="sub-well"> <p><span class="et">Middle English <em class="mw_t_it">counten</em>, from Middle French <em class="mw_t_it">conter, compter</em>, from Latin <em class="mw_t_it">computare</em> to reckon, compute, from <em class="mw_t_it">com- + putare</em> to consider, think — more at <a href="bword://pave" class="mw_t_mat">pave</a></span></p> <p>First Known Use: 14th century (transitive sense 1a)</p> </div> </div></div> <div class="section custom-accordion related-to" data-id="related-to">	<h2 class="toggle"><span class="text">Related to COUNT </span><span class="toggle-icon">[+]</span></h2>	<div class="section-content">	<div class="sub-well"> <div id="synonym-discussion-anchor" class="widget syns_discussion syns-module-anchor"> <div class="syn synonym-discussion"> <p class="syn"> <strong>Synonym Discussion</strong> <a href="bword://tell" class="mw_t_sc">tell</a>, <a href="bword://enumerate" class="mw_t_sc">enumerate</a>, <a href="bword://number" class="mw_t_sc">number</a>: <a href="bword://count" class="mw_t_sc">count</a> is likely to call attention to the finding of a total without minimizing the notion of numbering units or groups in the process of attaining to that total <span class="ex-sent t has-aq sents sents-inline"> → as many as 30 bonfires could be <em class="mw_t_it">counted</em> within the whole bounds of the district </span> <span class="ex-sent aq has-aq sents"> <span class="aq"> <span class="auth"> — Thomas Hardy</span></span> </span> <a href="bword://tell" class="mw_t_sc">tell</a> now archaic in suggestion, may center attention on the fact of units being counted <span class="ex-sent t no-aq sents sents-inline"> → <span class="mw_t_sp"><em class="mw_t_it">telling</em> one's beads</span> </span> <span class="ex-sent t no-aq sents sents-inline"> → a shepherd <em class="mw_t_it">telling</em> his sheep </span> <a href="bword://enumerate" class="mw_t_sc">enumerate</a> may suggest counting up or totaling with specific and clear treatment of each item <span class="ex-sent t has-aq sents sents-inline"> → Pliny <em class="mw_t_it">enumerates</em> among the trees of Syria the date, pistachio, fig, cedar, juniper, terebinth, and sumac </span> <span class="ex-sent aq has-aq sents"> <span class="aq"> <span class="auth"> — P. K. Hitti</span></span> </span> <span class="ex-sent t has-aq sents sents-inline"> → among the <em class="mw_t_it">enumerated</em> powers, we do not find that of establishing a bank or creating a corporation </span> <span class="ex-sent aq has-aq sents"> <span class="aq"> <span class="auth"> — John Marshall</span></span> </span> <a href="bword://number" class="mw_t_sc">number</a> may suggest either limited allotting or precise ordering in sequence <span class="ex-sent t no-aq sents sents-inline"> → the days of every human being are <em class="mw_t_it">numbered</em> </span> <span class="ex-sent t no-aq sents sents-inline"> → to <em class="mw_t_it">number</em> the volumes on the shelf </span> </p><p class="see-in-addition"><strong>synonyms</strong> see in addition <a href="bword://rely" class="sa-link sc">rely</a> </p> <p></p> </div> </div> </div>	</div></div> </div> </div> </div> </div></div> </div></mean><mean show="1"><div class="page-content">  <div class="well content-body definition-body"><div class="wordclick" data-word-click="enabled"> <div class="left-content col-xl-12"> <div class="row entry-header"> <div class="col-12"> <h1 class="hword"> <sup>2</sup> count</h1>  <span class="fl">noun</span> <span class="prs"> <span class="first-slash">\</span><span class="pr"> ˈkau̇nt</span> <a class="play-pron hw-play-pron" data-lang="en_us" href="sound://c/count001.mp3"><span class="audio-icon"></span></a><span class="addPunct">, </span><span class="pr"> <em class="mw_t_it">dialectally</em> ˈkyau̇nt</span> <span class="last-slash">\</span> </span> </div></div> <div class="row headword-row"> <div class="col"> <span class="vg-ins"> <em>inflected form(s): </em> <span class="il plural"> plural </span><span class="ix">-s</span> </span> </div> </div> <div class="section" data-id="definition"> <div class="def-wrapper"> <div class="vg"> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-1"><span class="num">1</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>the action or process of numbering, counting, or reckoning <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ completing the <span class="mw_t_wi">count</span> of the ballots</span></span></span> </div> </span> </div> <div class="sb has-num has-let"> <span class="sb-0"> <div class="sense has-sn"> <span class="sn sense-2 a"><span class="num">2</span><span class="letter">a</span></span> <span class="sl">archaic </span>  <span class="dt hasSdSense"><strong class="mw_t_bc">: </strong>a reckoning of money, goods, or conduct <span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">→ call to <span class="mw_t_wi">count</span></span><span class="ex-sent aq has-aq sents"><span class="aq"><span class="auth"> — Edmund Spenser</span></span></span></span> <strong class="mw_t_bc">: </strong><a href="bword://account" class="mw_t_sx"><span class="text-uppercase">account</span></a></span> <span class="sdsense"> <span class="sd">specifically</span> <strong class="mw_t_bc">: </strong>a statement of stewardship or managing </span> </div> </span> <span class="sb-1"> <div class="sense has-sn"> <span class="sn sense-b"><span class="letter">b</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>formulation of a total arrived at by examination of a sample <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ a <span class="mw_t_wi">count</span> of white corpuscles</span></span></span> </div> </span> <span class="sb-2"> <div class="sense has-sn"> <span class="sn sense-c"><span class="letter">c</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>population enumeration <strong class="mw_t_bc">: </strong><a href="bword://census" class="mw_t_sx"><span class="text-uppercase">census</span></a></span> </div> </span> </div> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-3"><span class="num">3</span></span> <span class="sl">archaic </span>  <span class="dt "><strong class="mw_t_bc">: </strong>consideration as important <strong class="mw_t_bc">: </strong><a href="bword://estimation" class="mw_t_sx"><span class="text-uppercase">estimation</span></a>, <a href="bword://regard" class="mw_t_sx"><span class="text-uppercase">regard</span></a></span> </div> </span> </div> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-4"><span class="num">4</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>number or sum total obtained by counting <strong class="mw_t_bc">: </strong><a href="bword://enumeration" class="mw_t_sx"><span class="text-uppercase">enumeration</span></a>, <a href="bword://tally" class="mw_t_sx"><span class="text-uppercase">tally</span></a> <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ the official <span class="mw_t_wi">count</span> came to over a hundred</span></span></span> </div> </span> </div> <div class="sb has-num has-let"> <span class="sb-0"> <div class="sense has-sn"> <span class="sn sense-5 a"><span class="num">5</span><span class="letter">a</span></span> <span class="dt hasSdSense"><strong class="mw_t_bc">: </strong><a href="bword://allegation" class="mw_t_sx"><span class="text-uppercase">allegation</span></a>, <a href="bword://charge" class="mw_t_sx"><span class="text-uppercase">charge</span></a></span> <span class="sdsense"> <span class="sd">specifically</span> <strong class="mw_t_bc">: </strong>a particular allegation or charge separately stating the cause of action or prosecution in a legal declaration or indictment <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ the jury found him innocent on the first <span class="mw_t_wi">count</span>, guilty on the second and third </span></span></span><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">→ guilty on all <span class="mw_t_wi">counts</span> </span></span> </div> </span> <span class="sb-1"> <div class="sense has-sn"> <span class="sn sense-b"><span class="letter">b</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>the declaration in common-law pleading when the plaintiff has but one cause of action and makes but one statement of it</span> </div> </span> <span class="sb-2"> <div class="sense has-sn"> <span class="sn sense-c"><span class="letter">c</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>a specific point under consideration <strong class="mw_t_bc">: </strong><a href="bword://issue" class="mw_t_sx"><span class="text-uppercase">issue</span></a> <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ disagreeing on this <span class="mw_t_wi">count</span></span></span></span> </div> </span> </div> <div class="sb has-num has-let"> <span class="sb-0"> <div class="sense has-sn"> <span class="sn sense-6 a"><span class="num">6</span><span class="letter">a</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>the calling off of the seconds from one to ten when a boxer has been knocked down <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ took a <span class="mw_t_wi">count</span> of nine before getting up</span></span></span> </div> </span> <span class="sb-1"> <div class="sense has-sn"> <span class="sn sense-b"><span class="letter">b</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>the number of balls and strikes charged to a baseball batter at one turn <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ a full <span class="mw_t_wi">count</span> of 3 and 2</span></span></span> </div> </span> <span class="sb-2"> <div class="sense has-sn"> <span class="sn sense-c"><span class="letter">c</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>the number of bowling pins knocked down with the first bowl of a frame that is added to a spare in the previous frame</span> </div> </span> <span class="sb-3"> <div class="sense has-sn"> <span class="sn sense-d"><span class="letter">d</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>an estimate of the number of cards in each suit that were originally dealt to or are still held by another player <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ take a <span class="mw_t_wi">count</span> on the opponents' hands</span></span></span> </div> </span> <span class="sb-4"> <div class="sense has-sn"> <span class="sn sense-e"><span class="letter">e</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>point count in bridge</span> </div> </span> <span class="sb-5"> <div class="sense has-sn"> <span class="sn sense-f"><span class="letter">f</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>a point or points scored in a game or the total points that have been scored up to any particular time <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">→ the <span class="mw_t_wi">count</span> now stands at 15–30</span></span></span> </div> </span> </div> <div class="sb has-num has-let"> <span class="sb-0"> <div class="sense has-sn"> <span class="sn sense-7 a"><span class="num">7</span><span class="letter">a</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>an oyster, terrapin, or food fish of a size reckoned as standard or above a specified minimum size <span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used chiefly in selling by the number</span></span></span></span> </div> </span> <span class="sb-1"> <div class="sense has-sn"> <span class="sn sense-b"><span class="letter">b</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>a stem bearing nine or more hands of bananas</span> </div> </span> <span class="sb-2"> <div class="sense has-sn"> <span class="sn sense-c"><span class="letter">c</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>the number of sheets of paper or board that make up a given weight or unit</span> </div> </span> </div> <div class="sb has-num has-let"> <span class="sb-0"> <div class="sense has-sn"> <span class="sn sense-8 a"><span class="num">8</span><span class="letter">a</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>a system of measuring yarns by the number of hanks or yards per pound and indicating size or fineness</span> </div> </span> <span class="sb-1"> <div class="sense has-sn"> <span class="sn sense-b"><span class="letter">b</span></span> <span class="dt "><strong class="mw_t_bc">: </strong>the number of warp yarns and weft yarns per inch in a textile fabric <span class="dx-jump"> — compare <a href="bword://pick[5]" class="mw_t_dxt"> <sup>5</sup><span class="text-uppercase">pick</span></a> <span class="text-lowercase">2b</span></span></span> </div> </span> </div> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-9"><span class="num">9</span></span> <span class="dt hasSdSense"><strong class="mw_t_bc">: </strong>an indication by an enumerating device of an ionizing event (as the arrival of a cosmic-ray particle) or of the total number of such events in a given period</span> <span class="sdsense"> <span class="sd">also</span> <strong class="mw_t_bc">: </strong>a single ionizing event <span class="dx-jump"> — compare <a href="bword://counting tube" class="mw_t_dxt"><span class="text-uppercase">counting tube</span></a></span> </span> </div> </span> </div> </div> </div> <div class="def-accordion-sections"> <div class="section custom-accordion" data-id="origin"> <h2 class="toggle"><span class="text">Origin of COUNT</span><span class="toggle-icon">[+]</span></h2> <div class="section-content etymology"> <div class="sub-well"> <p><span class="et">Middle English <em class="mw_t_it">counte</em>, from Middle French <em class="mw_t_it">conte, compte</em>, from Late Latin <em class="mw_t_it">computus</em> computation, from Latin <em class="mw_t_it">computare</em> to reckon, compute</span></p> <p>First Known Use: 14th century (sense 1)</p> </div> </div></div> </div> </div> </div> </div></div> </div></mean><mean show="2"><div class="page-content">  <div class="well content-body definition-body"><div class="wordclick" data-word-click="enabled"> <div class="left-content col-xl-12"> <div class="row entry-header"> <div class="col-12"> <h1 class="hword"> <sup>3</sup> count</h1>  <span class="fl">noun</span> <span class="prs"> <span class="first-slash">\</span><span class="pr"> ˈkau̇nt</span> <a class="play-pron hw-play-pron" data-lang="en_us" href="sound://c/count001.mp3"><span class="audio-icon"></span></a><span class="addPunct">, </span><span class="pr"> <em class="mw_t_it">dialectally</em> ˈkyau̇nt</span> <span class="last-slash">\</span> </span> </div></div> <div class="row headword-row"> <div class="col"> <span class="vg-ins"> <em>inflected form(s): </em> <span class="il plural"> plural </span><span class="ix">-s</span> </span> </div> </div> <div class="section" data-id="definition"> <div class="def-wrapper"> <div class="vg"> <div class="sb no-sn"> <span class="sb-0"> <div class="sense no-subnum"> <span class="dt "><strong class="mw_t_bc">: </strong>a European nobleman whose rank corresponds to that of a British earl</span> </div> </span> </div> </div> </div> <div class="def-accordion-sections"> <div class="section custom-accordion" data-id="origin"> <h2 class="toggle"><span class="text">Origin of COUNT</span><span class="toggle-icon">[+]</span></h2> <div class="section-content etymology"> <div class="sub-well"> <p><span class="et">Middle French <em class="mw_t_it">conte, comte</em>, from Late Latin <em class="mw_t_it">comit-, comes</em>, from Latin, associate, companion, one of the imperial court or train, literally, one who goes with another, from <em class="mw_t_it">com- + -it-, -es</em> (from <em class="mw_t_it">ire</em> to go) — more at <a href="bword://issue" class="mw_t_mat">issue</a></span></p> <p>First Known Use: 15th century </p> </div> </div></div> </div> </div> </div> </div></div> </div></mean></mwu>
```

## Making Yomitan Dictionaries　<!-- omit in toc -->

This document provides an overview on how to create your own Yomitan dictionary.

- [Instruction](#instruction)
  - [Example mdx dictionary html](#example-mdx-dictionary-html)
    - [hello](#hello)
    - [count](#count)
    - [Tools](#tools)
    - [Read the Schemas](#read-the-schemas)
    - [Adding Custom CSS](#adding-custom-css)
    - [Packaging A Dictionary](#packaging-a-dictionary)
    - [Examples](#examples)
    - [Schema Validation](#schema-validation)
    - [Conjugation](#conjugation)
    - [Tag Categories](#tag-categories)
  - [yomitan dictionary schame](#yomitan-dictionary-schame)
    - [dictionary-term-bank-v3-schema.json](#dictionary-term-bank-v3-schemajson)
    - [dictionary-tag-bank-v3-schema.json](#dictionary-tag-bank-v3-schemajson)
  - [english-transforms.js](#english-transformsjs)
    - [Context](#context)
  - [yomitan-dictionary-builder type definition](#yomitan-dictionary-builder-type-definition)
    - [src/types/dictionary.text](#srctypesdictionarytext)
    - [src/types/yomitan/termbank.ts](#srctypesyomitantermbankts)
    - [src/types/yomitan/tagbank.ts](#srctypesyomitantagbankts)
  - [index.ts](#indexts)

### Tools

- [Yomichan Dictionary Builder](https://github.com/MarvNC/yomichan-dict-builder/): A node package that simplifies the process of making dictionaries, particularly useful for those using TypeScript or JavaScript.
- [hasUTF16SurrogatePairAt](https://www.npmjs.com/package/@stdlib/assert-has-utf16-surrogate-pair-at): Important for checking if a kanji/hanzi is a surrogate pair, which affects string operations in JavaScript.
- [japanese-furigana-normalize](https://github.com/MarvNC/japanese-furigana-normalize): A utility function to normalize Japanese readings containing furigana, ensuring proper alignment with kanji characters.

### Read the Schemas

Familiarity with the [Yomitan schemas](https://github.com/yomidevs/yomitan/tree/master/ext/data/schemas) is essential. These schemas define the structure of Yomitan dictionaries. Helpful resources for interpreting JSON schemas include [codebeautify](https://codebeautify.org/jsonviewer/), [json-schema-viewer](https://json-schema-viewer.vercel.app/), and [jsonhero](https://jsonhero.io/).

Below is a list of Yomitan dictionary schemas, their expected filenames, and their usage:

| Schema                                                                                                                                                    | Expected Filename                | Usage                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------- |
| [`dictionary-index-schema.json`](https://github.com/yomidevs/yomitan/tree/master/ext/data/schemas/dictionary-index-schema.json)                           | `index.json`                     | Metadata about the dictionary. Please include as much detail as possible.              |
| [`dictionary-kanji-bank-v3-schema.json`](https://github.com/yomidevs/yomitan/tree/master/ext/data/schemas/dictionary-kanji-bank-v3-schema.json)           | `kanji_bank_${number}.json`      | Information used in the kanji viewer - meanings, readings, statistics, and codepoints. |
| [`dictionary-kanji-meta-bank-v3-schema.json`](https://github.com/yomidevs/yomitan/tree/master/ext/data/schemas/dictionary-kanji-meta-bank-v3-schema.json) | `kanji_meta-bank_${number}.json` | Stores kanji frequency data.                                                           |
| [`dictionary-tag-bank-v3-schema.json`](https://github.com/yomidevs/yomitan/tree/master/ext/data/schemas/dictionary-tag-bank-v3-schema.json)               | `tag_bank_${number}.json`        | Defines tags for kanji and term dictionaries, like parts of speech or kanken level.    |
| [`dictionary-term-bank-v3-schema.json`](https://github.com/yomidevs/yomitan/tree/master/ext/data/schemas/dictionary-term-bank-v3-schema.json)             | `term_bank_${number}.json`       | Stores dictionary readings, definitions, etc.                                          |
| [`dictionary-term-meta-bank-v3-schema.json`](https://github.com/yomidevs/yomitan/tree/master/ext/data/schemas/dictionary-term-meta-bank-v3-schema.json)   | `term_meta_bank_${number}.json`  | Stores meta information about terms, such as frequency data and pitch accent data.     |

### Adding Custom CSS

You can add custom CSS to a dictionary simply by adding a `styles.css` file to the root of the dictionary zip archive. This file will be loaded by Yomitan and applied to the dictionary viewer with the styles scoped to the dictionary. For example, observe the `styles.css` file in the [official test dictionary](https://github.com/yomidevs/yomitan/tree/master/test/data/dictionaries/valid-dictionary1).

### Packaging A Dictionary

A dictionary can contain various types of information within the zip file. After creating an `index.json` and the relevant data files, zip them with all data `.json` files in the root directory of the zip, not in subfolders. Use the highest compression level possible to reduce the size.

### Examples

- The [official test dictionary](https://github.com/yomidevs/yomitan/tree/master/test/data/dictionaries/valid-dictionary1) showcases the full range of features available in Yomitan dictionaries.

### Schema Validation

To validate schemas, configure [VSCode](https://code.visualstudio.com/docs/languages/json#_json-schemas-and-settings) to validate schemas or use a website such as [jsonschemavalidator](https://www.jsonschemavalidator.net/).

For VSCode validation, use the following settings JSON:

```json
  "json.schemas": [
    {
      "fileMatch": ["kanji_bank_*.json"],
      "url": "https://github.com/yomidevs/yomitan/raw/master/ext/data/schemas/dictionary-kanji-bank-v3-schema.json"
    },
    {
      "fileMatch": ["kanji_meta_bank_*.json"],
      "url": "https://github.com/yomidevs/yomitan/raw/master/ext/data/schemas/dictionary-kanji-meta-bank-v3-schema.json"
    },
    {
      "fileMatch": ["tag_bank_*.json"],
      "url": "https://github.com/yomidevs/yomitan/raw/master/ext/data/schemas/dictionary-tag-bank-v3-schema.json"
    },
    {
      "fileMatch": ["term_bank_*.json"],
      "url": "https://github.com/yomidevs/yomitan/raw/master/ext/data/schemas/dictionary-term-bank-v3-schema.json"
    },
    {
      "fileMatch": ["term_meta_bank_*.json"],
      "url": "https://github.com/yomidevs/yomitan/raw/master/ext/data/schemas/dictionary-term-meta-bank-v3-schema.json"
    }
  ],
```

### Conjugation

For Yomitan to conjugate Japanese terms, they need the appropriate part of speech tag. The part of speech labels are documented on the [official JMDict page](http://www.edrdg.org/jmdictdb/cgi-bin/edhelp.py?svc=jmdict&sid=#kw_pos). For other languages, find the part of speech tags in `ext/js/language/{language}/{language}-transforms.js` under the `conditions` label, for labels that aren't prefixed with "Intermediate".

### Tag Categories

The second item in the array of the tag bank schema determines the tag category, affecting the tag color in the user interface. The categories include:

- name
- expression
- popular
- frequent
- archaism
- dictionary
- frequency
- partOfSpeech
- search
- pronunciation-dictionary
- search

You can view the tag colors [here](https://github.com/yomidevs/yomitan/blob/48f1d012ad5045319d4e492dfbefa39da92817b2/ext/css/display.css#L136-L149).

## yomitan dictionary schame

### dictionary-term-bank-v3-schema.json

```json
{
    "$id": "dictionaryTermBankV3",
    "$schema": "http://json-schema.org/draft-07/schema#",
    "definitions": {
        "structuredContent": {
            "oneOf": [
                {
                    "type": "string",
                    "description": "Represents a text node."
                },
                {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/structuredContent",
                        "description": "An array of child content."
                    }
                },
                {
                    "type": "object",
                    "oneOf": [
                        {
                            "type": "object",
                            "description": "Empty tags.",
                            "required": [
                                "tag"
                            ],
                            "additionalProperties": false,
                            "properties": {
                                "tag": {
                                    "type": "string",
                                    "const": "br"
                                },
                                "data": {
                                    "$ref": "#/definitions/structuredContentData"
                                }
                            }
                        },
                        {
                            "type": "object",
                            "description": "Generic container tags.",
                            "required": [
                                "tag"
                            ],
                            "additionalProperties": false,
                            "properties": {
                                "tag": {
                                    "type": "string",
                                    "enum": ["ruby", "rt", "rp", "table", "thead", "tbody", "tfoot", "tr"]
                                },
                                "content": {
                                    "$ref": "#/definitions/structuredContent"
                                },
                                "data": {
                                    "$ref": "#/definitions/structuredContentData"
                                },
                                "lang": {
                                    "type": "string",
                                    "description": "Defines the language of an element in the format defined by RFC 5646."
                                }
                            }
                        },
                        {
                            "type": "object",
                            "description": "Table tags.",
                            "required": [
                                "tag"
                            ],
                            "additionalProperties": false,
                            "properties": {
                                "tag": {
                                    "type": "string",
                                    "enum": ["td", "th"]
                                },
                                "content": {
                                    "$ref": "#/definitions/structuredContent"
                                },
                                "data": {
                                    "$ref": "#/definitions/structuredContentData"
                                },
                                "colSpan": {
                                    "type": "integer",
                                    "minimum": 1
                                },
                                "rowSpan": {
                                    "type": "integer",
                                    "minimum": 1
                                },
                                "style": {
                                    "$ref": "#/definitions/structuredContentStyle"
                                },
                                "lang": {
                                    "type": "string",
                                    "description": "Defines the language of an element in the format defined by RFC 5646."
                                }
                            }
                        },
                        {
                            "type": "object",
                            "description": "Container tags supporting configurable styles.",
                            "required": [
                                "tag"
                            ],
                            "additionalProperties": false,
                            "properties": {
                                "tag": {
                                    "type": "string",
                                    "enum": ["span", "div", "ol", "ul", "li", "details", "summary"]
                                },
                                "content": {
                                    "$ref": "#/definitions/structuredContent"
                                },
                                "data": {
                                    "$ref": "#/definitions/structuredContentData"
                                },
                                "style": {
                                    "$ref": "#/definitions/structuredContentStyle"
                                },
                                "title": {
                                    "type": "string",
                                    "description": "Hover text for the element."
                                },
                                "open": {
                                    "type": "boolean",
                                    "description": "Whether or not the details element is open by default."
                                },
                                "lang": {
                                    "type": "string",
                                    "description": "Defines the language of an element in the format defined by RFC 5646."
                                }
                            }
                        },
                        {
                            "type": "object",
                            "description": "Image tag.",
                            "required": [
                                "tag",
                                "path"
                            ],
                            "additionalProperties": false,
                            "properties": {
                                "tag": {
                                    "type": "string",
                                    "const": "img"
                                },
                                "data": {
                                    "$ref": "#/definitions/structuredContentData"
                                },
                                "path": {
                                    "type": "string",
                                    "description": "Path to the image file in the archive."
                                },
                                "width": {
                                    "type": "number",
                                    "description": "Preferred width of the image.",
                                    "minimum": 0
                                },
                                "height": {
                                    "type": "number",
                                    "description": "Preferred height of the image.",
                                    "minimum": 0
                                },
                                "title": {
                                    "type": "string",
                                    "description": "Hover text for the image."
                                },
                                "alt": {
                                    "type": "string",
                                    "description": "Alt text for the image."
                                },
                                "description": {
                                    "type": "string",
                                    "description": "Description of the image."
                                },
                                "pixelated": {
                                    "type": "boolean",
                                    "description": "Whether or not the image should appear pixelated at sizes larger than the image's native resolution.",
                                    "default": false
                                },
                                "imageRendering": {
                                    "type": "string",
                                    "description": "Controls how the image is rendered. The value of this field supersedes the pixelated field.",
                                    "enum": ["auto", "pixelated", "crisp-edges"],
                                    "default": "auto"
                                },
                                "appearance": {
                                    "type": "string",
                                    "description": "Controls the appearance of the image. The \"monochrome\" value will mask the opaque parts of the image using the current text color.",
                                    "enum": ["auto", "monochrome"],
                                    "default": "auto"
                                },
                                "background": {
                                    "type": "boolean",
                                    "description": "Whether or not a background color is displayed behind the image.",
                                    "default": true
                                },
                                "collapsed": {
                                    "type": "boolean",
                                    "description": "Whether or not the image is collapsed by default.",
                                    "default": false
                                },
                                "collapsible": {
                                    "type": "boolean",
                                    "description": "Whether or not the image can be collapsed.",
                                    "default": false
                                },
                                "verticalAlign": {
                                    "type": "string",
                                    "description": "The vertical alignment of the image.",
                                    "enum": ["baseline", "sub", "super", "text-top", "text-bottom", "middle", "top", "bottom"]
                                },
                                "border": {
                                    "type": "string",
                                    "description": "Shorthand for border width, style, and color."
                                },
                                "borderRadius": {
                                    "type": "string",
                                    "description": "Roundness of the corners of the image's outer border edge."
                                },
                                "sizeUnits": {
                                    "type": "string",
                                    "description": "The units for the width and height.",
                                    "enum": ["px", "em"]
                                }
                            }
                        },
                        {
                            "type": "object",
                            "description": "Link tag.",
                            "required": [
                                "tag",
                                "href"
                            ],
                            "additionalProperties": false,
                            "properties": {
                                "tag": {
                                    "type": "string",
                                    "const": "a"
                                },
                                "content": {
                                    "$ref": "#/definitions/structuredContent"
                                },
                                "href": {
                                    "type": "string",
                                    "description": "The URL for the link. URLs starting with a ? are treated as internal links to other dictionary content.",
                                    "pattern": "^(?:https?:|\\?)[\\w\\W]*"
                                },
                                "lang": {
                                    "type": "string",
                                    "description": "Defines the language of an element in the format defined by RFC 5646."
                                }
                            }
                        }
                    ]
                }
            ]
        },
        "structuredContentData": {
            "type": "object",
            "description": "Generic data attributes that should be added to the element.",
            "additionalProperties": {
                "type": "string"
            }
        },
        "structuredContentStyle": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "fontStyle": {
                    "type": "string",
                    "enum": ["normal", "italic"],
                    "default": "normal"
                },
                "fontWeight": {
                    "type": "string",
                    "enum": ["normal", "bold"],
                    "default": "normal"
                },
                "fontSize": {
                    "type": "string",
                    "default": "medium"
                },
                "color": {
                    "type": "string"
                },
                "background": {
                    "type": "string"
                },
                "backgroundColor": {
                    "type": "string"
                },
                "textDecorationLine": {
                    "oneOf": [
                        {
                            "type": "string",
                            "enum": ["none", "underline", "overline", "line-through"],
                            "default": "none"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string",
                                "enum": ["underline", "overline", "line-through"],
                                "default": "none"
                            }
                        }
                    ]
                },
                "textDecorationStyle": {
                    "type": "string",
                    "enum": ["solid", "double", "dotted", "dashed", "wavy"],
                    "default": "solid"
                },
                "textDecorationColor": {
                    "type": "string"
                },
                "borderColor": {
                    "type": "string"
                },
                "borderStyle": {
                    "type": "string"
                },
                "borderRadius": {
                    "type": "string"
                },
                "borderWidth": {
                    "type": "string"
                },
                "clipPath": {
                    "type": "string"
                },
                "verticalAlign": {
                    "type": "string",
                    "enum": ["baseline", "sub", "super", "text-top", "text-bottom", "middle", "top", "bottom"],
                    "default": "baseline"
                },
                "textAlign": {
                    "type": "string",
                    "enum": ["start", "end", "left", "right", "center", "justify", "justify-all", "match-parent"],
                    "default": "start"
                },
                "textEmphasis": {
                    "type": "string"
                },
                "textShadow": {
                    "type": "string"
                },
                "margin": {
                    "type": "string"
                },
                "marginTop": {
                    "type": ["number", "string"],
                    "default": 0
                },
                "marginLeft": {
                    "type": ["number", "string"],
                    "default": 0
                },
                "marginRight": {
                    "type": ["number", "string"],
                    "default": 0
                },
                "marginBottom": {
                    "type": ["number", "string"],
                    "default": 0
                },
                "padding": {
                    "type": "string"
                },
                "paddingTop": {
                    "type": "string"
                },
                "paddingLeft": {
                    "type": "string"
                },
                "paddingRight": {
                    "type": "string"
                },
                "paddingBottom": {
                    "type": "string"
                },
                "wordBreak": {
                    "type": "string",
                    "enum": ["normal", "break-all", "keep-all"],
                    "default": "normal"
                },
                "whiteSpace": {
                    "type": "string",
                    "default": "normal"
                },
                "cursor": {
                    "type": "string",
                    "default": "auto"
                },
                "listStyleType": {
                    "type": "string",
                    "default": "disc"
                }
            }
        }
    },
    "type": "array",
    "description": "Data file containing term information.",
    "items": {
        "type": "array",
        "description": "Information about a single term.",
        "minItems": 8,
        "maxItems": 8,
        "additionalItems": false,
        "items": [
            {
                "type": "string",
                "description": "The text for the term."
            },
            {
                "type": "string",
                "description": "Reading of the term, or an empty string if the reading is the same as the term."
            },
            {
                "type": ["string", "null"],
                "description": "String of space-separated tags for the definition. An empty string is treated as no tags."
            },
            {
                "type": "string",
                "description": "String of space-separated rule identifiers for the definition which is used to validate deinflection. An empty string should be used for words which aren't inflected."
            },
            {
                "type": "number",
                "description": "Score used to determine popularity. Negative values are more rare and positive values are more frequent. This score is also used to sort search results."
            },
            {
                "type": "array",
                "description": "Array of definitions for the term.",
                "items": {
                    "oneOf": [
                        {
                            "type": "string",
                            "description": "Single definition for the term."
                        },
                        {
                            "type": "object",
                            "description": "Single detailed definition for the term.",
                            "required": [
                                "type"
                            ],
                            "properties": {
                                "type": {
                                    "type": "string",
                                    "description": "The type of the data for this definition.",
                                    "enum": ["text", "image", "structured-content"]
                                }
                            },
                            "oneOf": [
                                {
                                    "required": [
                                        "type",
                                        "text"
                                    ],
                                    "additionalProperties": false,
                                    "properties": {
                                        "type": {
                                            "type": "string",
                                            "const": "text"
                                        },
                                        "text": {
                                            "type": "string",
                                            "description": "Single definition for the term."
                                        }
                                    }
                                },
                                {
                                    "required": [
                                        "type",
                                        "content"
                                    ],
                                    "additionalProperties": false,
                                    "properties": {
                                        "type": {
                                            "type": "string",
                                            "const": "structured-content"
                                        },
                                        "content": {
                                            "$ref": "#/definitions/structuredContent",
                                            "description": "Single definition for the term using a structured content object."
                                        }
                                    }
                                },
                                {
                                    "required": [
                                        "type",
                                        "path"
                                    ],
                                    "additionalProperties": false,
                                    "properties": {
                                        "type": {
                                            "type": "string",
                                            "const": "image"
                                        },
                                        "path": {
                                            "type": "string",
                                            "description": "Path to the image file in the archive."
                                        },
                                        "width": {
                                            "type": "integer",
                                            "description": "Preferred width of the image.",
                                            "minimum": 1
                                        },
                                        "height": {
                                            "type": "integer",
                                            "description": "Preferred height of the image.",
                                            "minimum": 1
                                        },
                                        "title": {
                                            "type": "string",
                                            "description": "Hover text for the image."
                                        },
                                        "alt": {
                                            "type": "string",
                                            "description": "Alt text for the image."
                                        },
                                        "description": {
                                            "type": "string",
                                            "description": "Description of the image."
                                        },
                                        "pixelated": {
                                            "type": "boolean",
                                            "description": "Whether or not the image should appear pixelated at sizes larger than the image's native resolution.",
                                            "default": false
                                        },
                                        "imageRendering": {
                                            "type": "string",
                                            "description": "Controls how the image is rendered. The value of this field supersedes the pixelated field.",
                                            "enum": ["auto", "pixelated", "crisp-edges"],
                                            "default": "auto"
                                        },
                                        "appearance": {
                                            "type": "string",
                                            "description": "Controls the appearance of the image. The \"monochrome\" value will mask the opaque parts of the image using the current text color.",
                                            "enum": ["auto", "monochrome"],
                                            "default": "auto"
                                        },
                                        "background": {
                                            "type": "boolean",
                                            "description": "Whether or not a background color is displayed behind the image.",
                                            "default": true
                                        },
                                        "collapsed": {
                                            "type": "boolean",
                                            "description": "Whether or not the image is collapsed by default.",
                                            "default": false
                                        },
                                        "collapsible": {
                                            "type": "boolean",
                                            "description": "Whether or not the image can be collapsed.",
                                            "default": true
                                        }
                                    }
                                }
                            ]
                        },
                        {
                            "type": "array",
                            "description": "Deinflection of the term to an uninflected term.",
                            "minItems": 2,
                            "maxItems": 2,
                            "items": [
                                {
                                    "type": "string",
                                    "description": "The uninflected term."
                                },
                                {
                                    "type": "array",
                                    "description": "A chain of inflection rules that produced the inflected term",
                                    "items": {
                                        "type": "string",
                                        "description": "A single inflection rule."
                                    }
                                }
                            ]
                        }
                    ]
                }
            },
            {
                "type": "integer",
                "description": "Sequence number for the term. Terms with the same sequence number can be shown together when the \"resultOutputMode\" option is set to \"merge\"."
            },
            {
                "type": "string",
                "description": "String of space-separated tags for the term. An empty string is treated as no tags."
            }
        ]
    }
}

```

### dictionary-tag-bank-v3-schema.json

```json
{
    "$id": "dictionaryTagBankV3",
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "array",
    "description": "Data file containing tag information for terms and kanji.",
    "items": {
        "type": "array",
        "description": "Information about a single tag.",
        "minItems": 5,
        "maxItems": 5,
        "additionalItems": false,
        "items": [
            {
                "type": "string",
                "description": "Tag name."
            },
            {
                "type": "string",
                "description": "Category for the tag."
            },
            {
                "type": "number",
                "description": "Sorting order for the tag."
            },
            {
                "type": "string",
                "description": "Notes for the tag."
            },
            {
                "type": "number",
                "description": "Score used to determine popularity. Negative values are more rare and positive values are more frequent. This score is also used to sort search results."
            }
        ]
    }
}
```

## english-transforms.js

### Context

- You need this file to get the information deinflect tag.

```js
import {prefixInflection, suffixInflection} from '../language-transforms.js';

/** @typedef {keyof typeof conditions} Condition */

/**
 * @param {string} consonants
 * @param {string} suffix
 * @param {Condition[]} conditionsIn
 * @param {Condition[]} conditionsOut
 * @returns {import('language-transformer').SuffixRule<Condition>[]}
 */
function doubledConsonantInflection(consonants, suffix, conditionsIn, conditionsOut) {
    const inflections = [];
    for (const consonant of consonants) {
        inflections.push(suffixInflection(`${consonant}${consonant}${suffix}`, consonant, conditionsIn, conditionsOut));
    }
    return inflections;
}

const pastSuffixInflections = [
    suffixInflection('ed', '', ['v'], ['v']), // 'walked'
    suffixInflection('ed', 'e', ['v'], ['v']), // 'hoped'
    suffixInflection('ied', 'y', ['v'], ['v']), // 'tried'
    suffixInflection('cked', 'c', ['v'], ['v']), // 'frolicked'
    ...doubledConsonantInflection('bdgklmnprstz', 'ed', ['v'], ['v']),

    suffixInflection('laid', 'lay', ['v'], ['v']),
    suffixInflection('paid', 'pay', ['v'], ['v']),
    suffixInflection('said', 'say', ['v'], ['v']),
];

const ingSuffixInflections = [
    suffixInflection('ing', '', ['v'], ['v']), // 'walking'
    suffixInflection('ing', 'e', ['v'], ['v']), // 'driving'
    suffixInflection('ying', 'ie', ['v'], ['v']), // 'lying'
    suffixInflection('cking', 'c', ['v'], ['v']), // 'panicking'
    ...doubledConsonantInflection('bdgklmnprstz', 'ing', ['v'], ['v']),
];

const thirdPersonSgPresentSuffixInflections = [
    suffixInflection('s', '', ['v'], ['v']), // 'walks'
    suffixInflection('es', '', ['v'], ['v']), // 'teaches'
    suffixInflection('ies', 'y', ['v'], ['v']), // 'tries'
];

const phrasalVerbParticles = ['aboard', 'about', 'above', 'across', 'ahead', 'alongside', 'apart', 'around', 'aside', 'astray', 'away', 'back', 'before', 'behind', 'below', 'beneath', 'besides', 'between', 'beyond', 'by', 'close', 'down', 'east', 'west', 'north', 'south', 'eastward', 'westward', 'northward', 'southward', 'forward', 'backward', 'backwards', 'forwards', 'home', 'in', 'inside', 'instead', 'near', 'off', 'on', 'opposite', 'out', 'outside', 'over', 'overhead', 'past', 'round', 'since', 'through', 'throughout', 'together', 'under', 'underneath', 'up', 'within', 'without'];
const phrasalVerbPrepositions = ['aback', 'about', 'above', 'across', 'after', 'against', 'ahead', 'along', 'among', 'apart', 'around', 'as', 'aside', 'at', 'away', 'back', 'before', 'behind', 'below', 'between', 'beyond', 'by', 'down', 'even', 'for', 'forth', 'forward', 'from', 'in', 'into', 'of', 'off', 'on', 'onto', 'open', 'out', 'over', 'past', 'round', 'through', 'to', 'together', 'toward', 'towards', 'under', 'up', 'upon', 'way', 'with', 'without'];

const particlesDisjunction = phrasalVerbParticles.join('|');
const phrasalVerbWordSet = new Set([...phrasalVerbParticles, ...phrasalVerbPrepositions]);
const phrasalVerbWordDisjunction = [...phrasalVerbWordSet].join('|');
/**
 * @type {import('language-transformer').Rule<Condition>}
 */
const phrasalVerbInterposedObjectRule = {
    type: 'other',
    isInflected: new RegExp(`^\\w* (?:(?!\\b(${phrasalVerbWordDisjunction})\\b).)+ (?:${particlesDisjunction})`),
    deinflect: (term) => {
        return term.replace(new RegExp(`(?<=\\w) (?:(?!\\b(${phrasalVerbWordDisjunction})\\b).)+ (?=(?:${particlesDisjunction}))`), ' ');
    },
    conditionsIn: [],
    conditionsOut: ['v_phr'],
};

/**
 * @param {string} inflected
 * @param {string} deinflected
 * @returns {import('language-transformer').Rule<Condition>}
 */
function createPhrasalVerbInflection(inflected, deinflected) {
    return {
        type: 'other',
        isInflected: new RegExp(`^\\w*${inflected} (?:${phrasalVerbWordDisjunction})`),
        deinflect: (term) => {
            return term.replace(new RegExp(`(?<=)${inflected}(?= (?:${phrasalVerbWordDisjunction}))`), deinflected);
        },
        conditionsIn: ['v'],
        conditionsOut: ['v_phr'],
    };
}

/**
 * @param {import('language-transformer').SuffixRule<Condition>[]} sourceRules
 * @returns {import('language-transformer').Rule<Condition>[]}
 */
function createPhrasalVerbInflectionsFromSuffixInflections(sourceRules) {
    return sourceRules.flatMap(({isInflected, deinflected}) => {
        if (typeof deinflected === 'undefined') { return []; }
        const inflectedSuffix = isInflected.source.replace('$', '');
        const deinflectedSuffix = deinflected;
        return [createPhrasalVerbInflection(inflectedSuffix, deinflectedSuffix)];
    });
}

const conditions = {
    v: {
        name: 'Verb',
        isDictionaryForm: true,
        subConditions: ['v_phr'],
    },
    v_phr: {
        name: 'Phrasal verb',
        isDictionaryForm: true,
    },
    n: {
        name: 'Noun',
        isDictionaryForm: true,
        subConditions: ['np', 'ns'],
    },
    np: {
        name: 'Noun plural',
        isDictionaryForm: true,
    },
    ns: {
        name: 'Noun singular',
        isDictionaryForm: true,
    },
    adj: {
        name: 'Adjective',
        isDictionaryForm: true,
    },
    adv: {
        name: 'Adverb',
        isDictionaryForm: true,
    },
};

/** @type {import('language-transformer').LanguageTransformDescriptor<Condition>} */
export const englishTransforms = {
    language: 'en',
    conditions,
    transforms: {
        'plural': {
            name: 'plural',
            description: 'Plural form of a noun',
            rules: [
                suffixInflection('s', '', ['np'], ['ns']),
                suffixInflection('es', '', ['np'], ['ns']),
                suffixInflection('ies', 'y', ['np'], ['ns']),
                suffixInflection('ves', 'fe', ['np'], ['ns']),
                suffixInflection('ves', 'f', ['np'], ['ns']),
            ],
        },
        'possessive': {
            name: 'possessive',
            description: 'Possessive form of a noun',
            rules: [
                suffixInflection('\'s', '', ['n'], ['n']),
                suffixInflection('s\'', 's', ['n'], ['n']),
            ],
        },
        'past': {
            name: 'past',
            description: 'Simple past tense of a verb',
            rules: [
                ...pastSuffixInflections,
                ...createPhrasalVerbInflectionsFromSuffixInflections(pastSuffixInflections),
            ],
        },
        'ing': {
            name: 'ing',
            description: 'Present participle of a verb',
            rules: [
                ...ingSuffixInflections,
                ...createPhrasalVerbInflectionsFromSuffixInflections(ingSuffixInflections),
            ],
        },
        '3rd pers. sing. pres': {
            name: '3rd pers. sing. pres',
            description: 'Third person singular present tense of a verb',
            rules: [
                ...thirdPersonSgPresentSuffixInflections,
                ...createPhrasalVerbInflectionsFromSuffixInflections(thirdPersonSgPresentSuffixInflections),
            ],
        },
        'interposed object': {
            name: 'interposed object',
            description: 'Phrasal verb with interposed object',
            rules: [
                phrasalVerbInterposedObjectRule,
            ],
        },
        'archaic': {
            name: 'archaic',
            description: 'Archaic form of a word',
            rules: [
                suffixInflection('\'d', 'ed', ['v'], ['v']),
            ],
        },
        'adverb': {
            name: 'adverb',
            description: 'Adverb form of an adjective',
            rules: [
                suffixInflection('ly', '', ['adv'], ['adj']), // 'quickly'
                suffixInflection('ily', 'y', ['adv'], ['adj']), // 'happily'
                suffixInflection('ly', 'le', ['adv'], ['adj']), // 'humbly'
            ],
        },
        'comparative': {
            name: 'comparative',
            description: 'Comparative form of an adjective',
            rules: [
                suffixInflection('er', '', ['adj'], ['adj']), // 'faster'
                suffixInflection('er', 'e', ['adj'], ['adj']), // 'nicer'
                suffixInflection('ier', 'y', ['adj'], ['adj']), // 'happier'
                ...doubledConsonantInflection('bdgmnt', 'er', ['adj'], ['adj']),
            ],
        },
        'superlative': {
            name: 'superlative',
            description: 'Superlative form of an adjective',
            rules: [
                suffixInflection('est', '', ['adj'], ['adj']), // 'fastest'
                suffixInflection('est', 'e', ['adj'], ['adj']), // 'nicest'
                suffixInflection('iest', 'y', ['adj'], ['adj']), // 'happiest'
                ...doubledConsonantInflection('bdgmnt', 'est', ['adj'], ['adj']),
            ],
        },
        'dropped g': {
            name: 'dropped g',
            description: 'Dropped g in -ing form of a verb',
            rules: [
                suffixInflection('in\'', 'ing', ['v'], ['v']),
            ],
        },
        '-y': {
            name: '-y',
            description: 'Adjective formed from a verb or noun',
            rules: [
                suffixInflection('y', '', ['adj'], ['n', 'v']), // 'dirty', 'pushy'
                suffixInflection('y', 'e', ['adj'], ['n', 'v']), // 'hazy'
                ...doubledConsonantInflection('glmnprst', 'y', [], ['n', 'v']), // 'baggy', 'saggy'
            ],
        },
        'un-': {
            name: 'un-',
            description: 'Negative form of an adjective, adverb, or verb',
            rules: [
                prefixInflection('un', '', ['adj', 'adv', 'v'], ['adj', 'adv', 'v']),
            ],
        },
        'going-to future': {
            name: 'going-to future',
            description: 'Going-to future tense of a verb',
            rules: [
                prefixInflection('going to ', '', ['v'], ['v']),
            ],
        },
        'will future': {
            name: 'will future',
            description: 'Will-future tense of a verb',
            rules: [
                prefixInflection('will ', '', ['v'], ['v']),
            ],
        },
        'imperative negative': {
            name: 'imperative negative',
            description: 'Negative imperative form of a verb',
            rules: [
                prefixInflection('don\'t ', '', ['v'], ['v']),
                prefixInflection('do not ', '', ['v'], ['v']),
            ],
        },
        '-able': {
            name: '-able',
            description: 'Adjective formed from a verb',
            rules: [
                suffixInflection('able', '', ['v'], ['adj']),
                suffixInflection('able', 'e', ['v'], ['adj']),
                suffixInflection('iable', 'y', ['v'], ['adj']),
                ...doubledConsonantInflection('bdgklmnprstz', 'able', ['v'], ['adj']),
            ],
        },
    },
};
```


## yomitan-dictionary-builder type definition

### src/types/dictionary.text
```
type ZipFile = `${string}.zip`;

type DictionaryOptions = {
  /**
   * The maximum number of terms in a single term/kanji bank.
   */
  termBankMaxSize?: number;
  /**
   * The file name to be used when exporting the dictionary.
   */
  fileName: ZipFile;
};

// DictionaryOptions with termBankMaxSize required
type DefaultOptions = Required<Pick<DictionaryOptions, 'termBankMaxSize'>>;

type DictionaryStats = {
  /**
   * The number of terms in the dictionary.
   */
  termCount: number;
  /**
   * The number of term metadata in the dictionary.
   */
  termMetaCount: number;
  /**
   * The number of kanji in the dictionary.
   */
  kanjiCount: number;
  /**
   * The number of kanji metadata in the dictionary.
   */
  kanjiMetaCount: number;
};

type Counters = {
  /**
   * The number of terms in the current term bank.
   */
  termBankCount: number;
  /**
   * The number of term metadata in the current term meta bank.
   */
  termMetaBankCount: number;
  /**
   * The number of kanji in the current kanji bank.
   */
  kanjiBankCount: number;
  /**
   * The number of kanji metadata in the current kanji meta bank.
   */
  kanjiMetaBankCount: number;
};

export { DictionaryOptions, DictionaryStats, Counters, DefaultOptions };
```

### src/types/yomitan/termbank.ts

```ts
type DetailedDefinition =
  | string
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'structured-content';
      content: StructuredContent;
    }
  | {
      type: 'image';
      path: string;
      width?: number;
      height?: number;
      title?: string;
      alt?: string;
      description?: string;
      pixelated?: boolean;
      imageRendering?: 'auto' | 'pixelated' | 'crisp-edges';
      appearance?: 'auto' | 'monochrome';
      background?: boolean;
      collapsed?: boolean;
      collapsible?: boolean;
    }
  | [
      uninflectedTerm: string, // The uninflected term.
      inflectionRules: string[], // A chain of inflection rules that produced the inflected term
    ];

type StructuredContentData = {
  [key: string]: string;
};

type StructuredContentStyle = {
  fontStyle?: 'normal' | 'italic';
  fontWeight?: 'normal' | 'bold';
  fontSize?: string;
  color?: string;
  background?: string;
  backgroundColor?: string;
  textDecorationLine?:
    | 'none'
    | 'underline'
    | 'overline'
    | 'line-through'
    | ('underline' | 'overline' | 'line-through')[];
  textDecorationStyle?: 'solid' | 'double' | 'dotted' | 'dashed' | 'wavy';
  textDecorationColor?: string;
  borderColor?: string;
  borderStyle?: string;
  borderRadius?: string;
  borderWidth?: string;
  clipPath?: string;
  verticalAlign?:
    | 'baseline'
    | 'sub'
    | 'super'
    | 'text-top'
    | 'text-bottom'
    | 'middle'
    | 'top'
    | 'bottom';
  textAlign?:
    | 'start'
    | 'end'
    | 'left'
    | 'right'
    | 'center'
    | 'justify'
    | 'justify-all'
    | 'match-parent';
  textEmphasis?: string;
  textShadow?: string;
  margin?: string;
  marginTop?: number | string;
  marginLeft?: number | string;
  marginRight?: number | string;
  marginBottom?: number | string;
  padding?: string;
  paddingTop?: string;
  paddingLeft?: string;
  paddingRight?: string;
  paddingBottom?: string;
  wordBreak?: 'normal' | 'break-all' | 'keep-all';
  whiteSpace?: string;
  cursor?: string;
  listStyleType?: string;
};

type StructuredContentNode =
  | string // Represents a text node
  | StructuredContentNode[] // An array of child content
  | {
      tag: 'br';
      data?: StructuredContentData;
    }
  | {
      tag: 'ruby' | 'rt' | 'rp' | 'table' | 'thead' | 'tbody' | 'tfoot' | 'tr';
      content?: StructuredContentNode;
      data?: StructuredContentData;
      lang?: string;
    }
  | {
      tag: 'td' | 'th';
      content?: StructuredContentNode;
      data?: StructuredContentData;
      colSpan?: number;
      rowSpan?: number;
      style?: StructuredContentStyle;
      lang?: string;
    }
  | {
      tag: 'span' | 'div' | 'ol' | 'ul' | 'li' | 'details' | 'summary';
      content?: StructuredContentNode;
      data?: StructuredContentData;
      style?: StructuredContentStyle;
      title?: string;
      lang?: string;
    }
  | {
      tag: 'img';
      data?: StructuredContentData;
      path: string;
      width?: number;
      height?: number;
      title?: string;
      alt?: string;
      description?: string;
      pixelated?: boolean;
      imageRendering?: 'auto' | 'pixelated' | 'crisp-edges';
      appearance?: 'auto' | 'monochrome';
      background?: boolean;
      collapsed?: boolean;
      collapsible?: boolean;
      verticalAlign?:
        | 'baseline'
        | 'sub'
        | 'super'
        | 'text-top'
        | 'text-bottom'
        | 'middle'
        | 'top'
        | 'bottom';
      border?: string;
      borderRadius?: string;
      sizeUnits?: 'px' | 'em';
    }
  | {
      tag: 'a';
      content?: StructuredContentNode;
      href: string;
      lang?: string;
    };

type StructuredContent = StructuredContentNode;

type TermInformation = [
  term: string,
  reading: string,
  definitionTags: string | null, // String of space-separated tags for the definition
  deinflectors: string, // String of space-separated rule identifiers for the definition
  popularity: number, // Score used to determine popularity
  DetailedDefinition[], // Array of definitions for the term
  sequenceNumber: number, // Sequence number for the term
  termTags: string, // String of space-separated tags for the term
];

type DictionaryTermBankV3 = TermInformation[];

export type {
  DictionaryTermBankV3,
  DetailedDefinition,
  StructuredContent,
  StructuredContentData,
  StructuredContentNode,
  StructuredContentStyle,
  TermInformation,
};
```

### src/types/yomitan/tagbank.ts


```
type TagInformation = [
  tagName: string,
  category: string,
  sortingOrder: number,
  notes: string,
  popularityScore: number,
];

type KanjiTagCategory =
  /**
   * Classification
   */
  | 'class'
  /**
   * Codepoint
   */
  | 'code'
  /**
   * Dictionary Indices
   */
  | 'index'
  /**
   * Misc (Shows up at the top)
   */
  | 'misc';

type TagOption = {
  /**
   * The name of the tag.
   */
  name: string;
  /**
   * The category of the tag.
   */
  category: string | KanjiTagCategory;
  /**
   * The sorting order of the tag.
   */
  sortingOrder?: number;
  /**
   * The notes of the tag.
   */
  notes?: string;
  /**
   * The popularity score of the tag.
   */
  popularityScore?: number;
};

type DictionaryTagBankV3 = TagInformation[];

export type { DictionaryTagBankV3, TagOption, TagInformation };
```
## index.ts
```ts
import {
  Dictionary,
  DictionaryIndex,
  TermEntry,
  KanjiEntry,
} from "yomichan-dict-builder";
import {
  DetailedDefinition,
  StructuredContent,
} from "yomichan-dict-builder/dist/types/yomitan/termbank";

(async () => {
  const dictionary = new Dictionary({
    fileName: `test.zip`,
  });

  // index
  const index = new DictionaryIndex()
    .setTitle("Test Dictionary" + Math.floor(Math.random() * 1000))
    .setRevision("1.0")
    .setAuthor("Marv")
    .setDescription("Test dictionary for yomichan-dict-builder")
    .setAttribution("test")
    .setUrl("https://example.com")
    .build();

  await dictionary.setIndex(index);

  // term entries
  const entry = new TermEntry("test").setReading("test").build();
  await dictionary.addTerm(entry);

  const sc: StructuredContent = {
    tag: "span",
    content: "string",
    data: {
      "dict-data": "test",
    },
    lang: "ja",
    style: {
      fontSize: "20px",
      fontWeight: "normal",
      textDecorationLine: "overline",
    },
  };

  const detailedDefinition: DetailedDefinition = {
    type: "structured-content",
    content: sc,
  };

  const entry2 = new TermEntry("work")
    .setReading("reading")
    .setTermTags("term tag")
    .setDefinitionTags("def tag")
    .setDeinflectors("n")
    // .addDetailedDefinition(detailedDefinition)
    .addDetailedDefinition("test2 definition")
    .build();
  await dictionary.addTerm(entry2);

  const entry3 = new TermEntry("test3s")
    .setReading("reading")
    .setTermTags("ns")
    .addDetailedDefinition(detailedDefinition)
    .addDetailedDefinition("test3 def")
    .build();
  await dictionary.addTerm(entry3);

  const entry4 = new TermEntry("test4")
    .setReading("reading")
    .setDeinflectors("test2")
    .build();
  await dictionary.addTerm(entry4);

  // test term bank iteration
  // for (let i = 0; i < 20000; i++) {
  //   const entry = new TermEntry(`i`).setReading("").build();
  //   await dictionary.addTerm(entry);
  // }

  // term meta
  // simple frequency
  dictionary.addTermMeta(["term", "freq", 1]);
  dictionary.addTermMeta(["term", "freq", "N1"]);
  dictionary.addTermMeta([
    "term",
    "freq",
    {
      value: 1,
      displayValue: "one",
    },
  ]);
  dictionary.addTermMeta([
    "a",
    "freq",
    {
      reading: "termreading",
      frequency: {
        value: 1,
        displayValue: "one",
      },
    },
  ]);
  // pitch
  dictionary.addTermMeta([
    "亜",
    "pitch",
    {
      reading: "あ",
      pitches: [
        {
          position: 1,
          // devoice: [], // optional
          // nasal: [], // optional
        },
      ],
    },
  ]);

  // tags
  dictionary.addTag({
    name: "jouyou",
    category: "frequent",
    sortingOrder: -5,
    notes: "included in list of regular-use characters",
    popularityScore: 0,
  });

  // add local file
  // await dictionary.addFile("./examples/icon64.png", "img/icon64.png");
  // /**
  //  * @type {import('../dist/types/yomitan/termbank').StructuredContent}
  //  */
  // const imageScNode = {
  //   tag: "img",
  //   path: "img/icon64.png",
  //   data: {
  //     "dict-data": "testImage",
  //   },
  //   title: "test image",
  // };

  // /**
  //  * @type {import('../dist/types/yomitan/termbank').StructuredContent}
  //  */
  // const scDefinition = {
  //   tag: "div",
  //   content: [
  //     {
  //       tag: "div",
  //       content: "test string",
  //       lang: "ja",
  //     },
  //     imageScNode,
  //   ],
  // };
  // /**
  //  * @type {import('../dist/types/yomitan/termbank').DetailedDefinition}
  //  */
  // const imageDetailedDefinition = {
  //   type: "structured-content",
  //   content: scDefinition,
  // };
  // const imgEntry = new TermEntry("img")
  //   .setReading("img")
  //   .addDetailedDefinition(imageDetailedDefinition)
  //   .build();

  // await dictionary.addTerm(imgEntry);

  // export
  const stats = await dictionary.export("./test");
  console.log("Done exporting!");
  console.table(stats);
  /**
┌────────────────┬────────┐
│    (index)     │ Values │
├────────────────┼────────┤
│   termCount    │ 20002  │
│ termMetaCount  │   5    │
│   kanjiCount   │   1    │
│ kanjiMetaCount │   3    │
└────────────────┴────────┘
   */
})();

```