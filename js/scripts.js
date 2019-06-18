//********************************************************************************************************************************************************/
// Magic: The Gathering - Batch Event Manager
// Author.: Slanfan Development (Mattias Berggren)
// Version: 1.0.12
// Date...: 2019.06.18
//********************************************************************************************************************************************************/

angular.module('tournamentApp', [])

.controller('TournamentController', function() {
    var app = this;

    // pairing settings
    app.maxAttempts = 20;
    app.maxDownPair = 10;

    app.activeTournament = '';
    app.activeBatch = '';
    app.activeMatch = '';
    app.activeAttendee = '';
    app.attendeeNewName = '';
    app.showTournamentArea = false;
    app.showBatchForm = false;
    app.tournamentName = '';
    app.tournamentImportFile;
    app.attendeeNames = '';
    app.newBatch = {
        matches: null,
        byRandom: null,
        byStandings: null
    }
    app.showAttendeeArea = true;
    app.showMatchArea = false;
    app.sorting = {
        matchList: {
            playerOne: false,
            playerTwo: false
        }
    }
    app.matchListFilter = '';
    app.attendeeListFilter = '';
    app.manualPairingMode = false;
    app.manualPairingSegment = null;

    if(localStorage.getItem("oldschoolDerbyTournaments")) {
        app.tournaments = JSON.parse(localStorage.getItem("oldschoolDerbyTournaments"));
    }
    else {
        app.tournaments = [];
    }

    app.saveLocalStorage = function() {
        localStorage.setItem("oldschoolDerbyTournaments", JSON.stringify(app.tournaments));
    }
    app.addTournament = function() {

        if(app.tournamentName == '') {
            alert("You can't create a tournament without a name!");
        }
        else {
            app.tournaments.push(app.createTournament());
            app.saveLocalStorage();
            
            app.tournamentName = '';
        }

    }
    app.createTournament = function() {
        let tournament = {
            id: app.guid(),
            name: app.tournamentName,
            status: {
                code: 0,
                text: "Unstarted",
                activeBatchNumber: null,
            },
            attendees: [],
            batches: []
        }

        return tournament;
    }
    app.addAttendees = function(tournamentId) {

        if(app.attendeeNames == '') {
            alert("You can't add attendees without a name!");
        }
        else {
            if(app.activeTournament.status.code > 0) {
                if(!confirm("Tournament has started, are you sure you want to add the player(s)?")) {
                    app.attendeeNames = '';
                    return
                }
            }
            let tournamentIndex = app.tournaments.findIndex(x => x.id == tournamentId);
            let attendees = app.attendeeNames;
            let attendeeArray = attendees.split('\n');
    
            attendeeArray.forEach(attendee => {
                if(attendee != "") {
                    let newAttendee = app.createAttendee(attendee)
                    app.tournaments[tournamentIndex].attendees.push(newAttendee);

                    // check if active batch is running or not (paired and waiting for results)
                    if(app.activeTournament.status.code == 3 || app.activeTournament.status.code == 4) {
                        console.log("matches to play for new player...");
                        console.log(app.activeBatch.matchesToPlay);
                        for(let i = 1; i <= app.activeBatch.matchesToPlay; i++) {
                            let unPairedPlayer = {
                                name: newAttendee.name,
                                id: newAttendee.id,
                                winner: false,
                                gameWins: null,
                                gameDrawn: 0,
                                drop: false,
                                segment: i,
                            }
                            app.activeBatch.unPairedPlayers.push(unPairedPlayer);
                        }
                    }
                }
            });

            app.tournaments[tournamentIndex].attendees.sort(function (a, b) { return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0); });
    
            app.saveLocalStorage();
    
            app.attendeeNames = '';
        }
    }
    app.deleteAttendee = function(tournamentId, attendeeId) {

        let confirmation = confirm("Are you sure you want to drop attendee?");

        if(confirmation) {
            let tournamentIndex = app.tournaments.findIndex(x => x.id == tournamentId);
            let attendeeIndex = app.tournaments[tournamentIndex].attendees.findIndex(x => x.id == attendeeId);

            app.tournaments[tournamentIndex].attendees.splice(attendeeIndex, 1);

            app.saveLocalStorage();
        }
    }
    app.deleteAllAttendees = function(tournamentId) {
        let confirmation = confirm("Are you sure you want to drop all attendees?");

        if(confirmation) {
            let tournamentIndex = app.tournaments.findIndex(x => x.id == tournamentId);
            
            app.tournaments[tournamentIndex].attendees.length = 0;

            app.saveLocalStorage();
        }
    }
    app.createAttendee = function(name) {
        let attendee = {
            id: app.guid(),
            name: name,
            haveByeMatch: false,
            haveDropped: false,
            matches: [],
            stats: {
                mp: 0,
                gp: 0,
                gwp: 0,
                mwp: 0,
                omwp: 0,
                ogwp: 0,
                adj_mp: 0,
                adj_gp: 0,
                adj_mwp: 0,
                adj_gwp: 0
            }
        }
        return attendee
    }
    app.activateTournament = function(tournamentId) {

        let index = app.tournaments.findIndex(x => x.id == tournamentId);
        app.activeTournament = app.tournaments[index];
        if(app.activeTournament.status.code > 1) {
            app.showAttendeeArea = false;
            app.showMatchArea = true;
            let batchId = app.activeTournament.batches[app.activeTournament.batches.length - 1].id;
            app.activateBatch(tournamentId, batchId);
        }
        else {
            app.showAttendeeArea = true;
            app.showMatchArea = false;
        }
        
    }
    app.deleteTournament = function(tournamentId) {
        let confirmation = confirm("Are you sure you want to delete tournament?");

        if(confirmation) {
            let index = app.tournaments.findIndex(x => x.id == tournamentId);
            console.log(index);
            app.tournaments.splice(index, 1);
    
            app.saveLocalStorage();
        }
    }
    app.addBatch = function(tournamentId) {
        let index = app.tournaments.findIndex(x => x.id == tournamentId);
        let currentBatchNumber = app.tournaments[index].batches.length - 1;

        if(app.tournaments[index].batches.length == 0) {
            let batchNumber = app.tournaments[index].batches.length + 1;
        
            app.tournaments[index].batches.push(app.createBatch(batchNumber));
            app.tournaments[index].status.activeBatchNumber = batchNumber;
            app.setTournamentStatus(index, 2);
            
            app.newBatch.matches = null;
            app.newBatch.byRandom = null;
            app.newBatch.byStandings = null;
            app.showBatchForm = false;
    
            app.saveLocalStorage();
        }
        else if(app.tournaments[index].batches[currentBatchNumber].isFinished) {
            if(app.newBatch.matches == null || app.newBatch.byRandom == null || app.newBatch.byStandings == null) {
                console.log("Batch form data:");
                console.log(app.newBatch);
                console.log(app.newBatch.matches);
                alert("To create a batch you need to input all relevant data!");
            }
            else {
                let batchNumber = app.tournaments[index].batches.length + 1;
        
                app.tournaments[index].batches.push(app.createBatch(batchNumber));
                app.tournaments[index].status.activeBatchNumber = batchNumber;
                app.setTournamentStatus(index, 2);

                app.newBatch.matches = null;
                app.newBatch.byRandom = null;
                app.newBatch.byStandings = null;
                app.showBatchForm = false;
        
                app.saveLocalStorage();
            }
        }
        else {
            alert("You can't create a new batch until current is finished!");
        }
    }
    app.createBatch = function(number) {
        let batch = {
            id: app.guid(),
            number: number,
            matchesToPlay: app.newBatch.matches,
            pairings: {
                byStandings: app.newBatch.byStandings,
                byRandom: app.newBatch.byRandom
            },
            matches: [],
            isPaired: false,
            isFinished: false,
            unPairedPlayers: [],
        }

        return batch;
    }
    app.activateBatch = function(tournamentId, batchId) {

        let index = app.tournaments.findIndex(x => x.id == tournamentId);
        let batchIndex = app.tournaments[index].batches.findIndex(x => x.id == batchId);

        app.activeBatch = app.tournaments[index].batches[batchIndex];
        console.log("Active Batch");
        console.log(app.activeBatch);

        if(app.activeBatch.number == app.activeTournament.status.activeBatchNumber) {
            if(app.activeBatch.isFinished) {
                console.log("Batch is ended.");
                app.setTournamentStatus(index, 5);
            }
            else if(app.activeBatch.matches.length == 0) {
                console.log("No matches, waiting for pairings.");
                app.setTournamentStatus(index, 2);
            }
            else if(app.activeBatch.matches.findIndex(x => x.isReported == false) == -1) {
                console.log("All matches are reported, update tournament status.");
                app.setTournamentStatus(index, 4);
            }
        }
    }
    app.getNumberOfMatches = function() {
        if(app.activeBatch != '') {
            console.log("Tournament id: " + app.activeTournament.id);
            let tournamentIndex = app.tournaments.findIndex(x => x.id == app.activeTournament.id);
            console.log("Tournament index: " + tournamentIndex);
            let batchIndex = app.tournaments[tournamentIndex].batches.findIndex(x => x.id == app.activeBatch.id);
            console.log("Batch index: " + batchIndex);
            return app.tournaments[tournamentIndex].batches[batchIndex].matches.length;
        }
        else {
            return 0;
        }

    }
    app.deleteBatch = function() {
        let index = app.tournaments.findIndex(x => x.id == app.activeTournament.id);
        app.tournaments[index].batches.pop();
        if(app.tournaments[index].batches.length == 0) {
            app.setTournamentStatus(index, 1);
            app.saveLocalStorage();
        }
        else {
            app.activeTournament.status.activeBatchNumber--;
            app.setTournamentStatus(index, 5);
            app.saveLocalStorage();
        }
    }
    app.newMatchData = function(batchNumber, matchNumber, matchType, player1id, player1name, player2id, player2name) {
        let matchData = {
            id: app.guid(),
            isReported: false,
            isDraw: false,
            batch: batchNumber,
            match: matchNumber,
            type: matchType,
            player1: {
                name: player1name,
                id: player1id,
                winner: false,
                gameWins: null,
                gameDrawn: 0,
                drop: false
            },
            player2: {
                name: player2name,
                id: player2id,
                winner: false,
                gameWins: null,
                gameDrawn: 0,
                drop: false
            },
            lookUp: player1name.toLowerCase() + player2name.toLowerCase() + " segment: " + matchNumber
        }

        return matchData;
    }
    app.newByeMatchData = function(batchNumber, matchNumber, matchType, player1id, player1name) {
        let matchData = {
            id: app.guid(),
            isReported: false,
            isDraw: false,
            batch: batchNumber,
            match: matchNumber,
            type: matchType,
            player1: {
                name: player1name,
                id: player1id,
                winner: false,
                gameWins: null,
                gameDrawn: 0,
                drop: false
            },
            player2: {
                name: "*** BYE ***",
                id: "*** BYE ***",
                winner: false,
                gameWins: null,
                gameDrawn: 0,
                drop: false
            },
            lookUp: player1name.toLowerCase() + "*** bye *** segment: " + matchNumber
        }

        return matchData;
    }
    app.activateMatch = function(matchId) {
        // let tournamentIndex = app.tournaments.findIndex(x => x.id == app.activeTournament.id);
        // let batchIndex = app.tournaments[tournamentIndex].batches.findIndex(x => x.id == app.activeBatch.id);
        let matchIndex = app.activeBatch.matches.findIndex(x => x.id == matchId);

        app.activeMatch = app.activeBatch.matches[matchIndex];
    }
    app.activateAttendee = function(attendeeId) {
        let attendeeIndex = app.activeTournament.attendees.findIndex(x => x.id == attendeeId);

        app.activeAttendee = app.activeTournament.attendees[attendeeIndex];
        console.log(app.activeAttendee);
    }
    app.renameActiveAttendee = function() {
        if(app.attendeeNewName == '' || app.attendeeNewName.length < 5) {
            alert("You need to input a name, with at least five letters...");
        }
        else {
            // rename
            if(app.attendeeNewName == app.activeAttendee.oldName) {
                app.activeAttendee.isRenamed = false;
            }
            else {
                app.activeAttendee.isRenamed = true;
            }
            app.activeAttendee.oldName = app.activeAttendee.name;
            app.activeAttendee.name = app.attendeeNewName;

            // rename for all event matches
            app.activeTournament.batches.forEach(batch => {
                batch.matches.forEach(match => {
                    if(match.player1.id == app.activeAttendee.id) {
                        match.player1.name = app.attendeeNewName;
                        match.lookUp = app.attendeeNewName.toLowerCase() + " " + match.player2.name.toLowerCase() + " segment: " + match.matchNumber;
                    }
                    if(match.player2.id == app.activeAttendee.id) {
                        match.player2.name = app.attendeeNewName;
                        match.lookUp = match.player1.name.toLowerCase() + " " + app.attendeeNewName.toLowerCase() + " segment: " + match.matchNumber;
                    }
                });
            });

            // rename for all attendees matches
            app.activeAttendee.matches.forEach(match => {
                let opponentIndex = app.activeTournament.attendees.findIndex(x => x.id == match.opponentId);

                app.activeTournament.attendees[opponentIndex].matches.forEach(opponentMatch => {
                    if(opponentMatch.opponentId == app.activeAttendee.id) {
                        opponentMatch.opponentName = app.attendeeNewName;
                    }
                })
            });
            
            app.attendeeNewName = '';

            app.saveLocalStorage();
        }

    }
    app.increaseGamesDrawn = function() {
        app.activeMatch.player1.gameDrawn++;
        app.activeMatch.player2.gameDrawn++;
    }
    app.decreaseGamesDrawn = function() {
        app.activeMatch.player1.gameDrawn--;
        app.activeMatch.player2.gameDrawn--;
        if(app.activeMatch.player1.gameDrawn < 0) {
            app.activeMatch.player1.gameDrawn = 0;
            app.activeMatch.player2.gameDrawn = 0;
        }
    }
    app.reportActiveMatch = function() {
        // check if result is there
        let noReport = false;
        if (app.activeMatch.isDraw == true) {
            if (app.activeMatch.player1.gameWins == null || app.activeMatch.player2.gameWins == null) {
                noReport = true;
            }
        }
        if (app.activeMatch.isDraw == false) {
            if (app.activeMatch.player1.winner == false && app.activeMatch.player2.gameWins == false) {
                noReport = true;
            }

            if (app.activeMatch.player1.gameWins == null || app.activeMatch.player2.gameWins == null) {
                noReport = true;
            }
        }

        if (noReport) {
            alert("Please select a winner/draw and a result to be able to report.");
        }
        else {
            app.activeMatch.isReported = true;
            app.activeMatch = '';

            app.saveLocalStorage();
            // check if all matches are reported
            if(app.activeBatch.matches.findIndex(x => x.isReported == false) == -1) {
                console.log("All matches are reported, update tournament status.");
                let index = app.tournaments.findIndex(x => x.id == app.activeTournament.id);
                app.setTournamentStatus(index, 4);
            }
            else {
                console.log("All matches NOT reported, keeping tournament status.")
            }
        }
    }
    app.matchListFiltered = function() {
        let filteredList = [];
        if(!app.activeBatch) {
            return [];
        }
        app.activeBatch.matches.forEach((match) => {
            if(app.matchListFilter == '') {
                filteredList.push(match);
            }
            else {
                if(match.lookUp.toLowerCase().includes(app.matchListFilter.toLowerCase())) {
                    filteredList.push(match);
                }
            }
        });
        return filteredList;
    }
    app.attendeeListFiltered = function() {
        let filteredList = [];
        if(!app.activeTournament) {
            return [];
        }
        app.activeTournament.attendees.forEach((attendee) => {
            if(app.attendeeListFilter == '') {
                filteredList.push(attendee);
            }
            else {
                if(attendee.name.toLowerCase().includes(app.attendeeListFilter.toLowerCase())) {
                    filteredList.push(attendee);
                }
            }
        });

        // sort players by MP, OMWP, GWP, OGWP
        filteredList.sort((a, b) => (a.stats.ogwp > b.stats.ogwp) ? -1 : ((b.stats.ogwp > a.stats.ogwp) ? 1 : 0));
        filteredList.sort((a, b) => (a.stats.gwp > b.stats.gwp) ? -1 : ((b.stats.gwp > a.stats.gwp) ? 1 : 0));
        filteredList.sort((a, b) => (a.stats.omwp > b.stats.omwp) ? -1 : ((b.stats.omwp > a.stats.omwp) ? 1 : 0));
        filteredList.sort((a, b) => (a.stats.mp > b.stats.mp) ? -1 : ((b.stats.mp > a.stats.mp) ? 1 : 0));

        return filteredList;
    }
    app.unpairedPlayersListFiltered = function() {
        let filteredList = [];
        if(!app.activeBatch) {
            return [];
        }
        app.activeBatch.unPairedPlayers.forEach((attendee) => {
            if(app.manualPairingSegment == null) {
                filteredList.push(attendee);
            }
            else {
                if(attendee.segment == app.manualPairingSegment || attendee.segment == 'new attendee') {
                    filteredList.push(attendee);
                }
            }
        });

        return filteredList;
    }
    app.endBatch = function() {
        let index = app.tournaments.findIndex(x => x.id == app.activeTournament.id);
        let batchNumber = app.activeTournament.status.activeBatchNumber;
        let batchIndex = app.activeTournament.batches.findIndex(x => x.number == batchNumber);

        app.activeTournament.batches[batchIndex].isFinished = true;

        app.saveAttendeeMatches();
        app.calculateStats();

        app.setTournamentStatus(index, 5);
        app.saveLocalStorage();
    }
    app.saveAttendeeMatches = function() {
        let tournamentIndex = app.tournaments.findIndex(x => x.id == app.activeTournament.id);
        
        // clear attendee matches
        app.tournaments[tournamentIndex].attendees.forEach(attendee => {
            attendee.matches.length = 0;
        });

        // go through all batches and add matches
        app.tournaments[tournamentIndex].batches.forEach((batch, index) => {
            batch.matches.forEach((match, index) => {
                
                let matchData1 = {
                    id: match.id,
                    batch: match.batch,
                    isDraw: match.isDraw,
                    winner: match.player1.winner,
                    gameWins: match.player1.gameWins,
                    gameDrawn: match.player1.gameDrawn,
                    drop: match.player1.drop,
                    opponentId: match.player2.id,
                    opponentName: match.player2.name,
                    opponentGameWins: match.player2.gameWins,
                }
                let player1index = app.tournaments[tournamentIndex].attendees.findIndex(x => x.id == match.player1.id);
                console.log("Adding match (1) for index:" + player1index + " name: " + app.tournaments[tournamentIndex].attendees[player1index].name);
                app.tournaments[tournamentIndex].attendees[player1index].matches.push(matchData1);
                if(matchData1.drop) {
                    app.tournaments[tournamentIndex].attendees[player1index].haveDropped = true;
                }
                if(matchData1.opponentId == "*** BYE ***") {
                    app.tournaments[tournamentIndex].attendees[player1index].haveByeMatch = true;
                }
                
                if(match.player2.id != "*** BYE ***") {
                    let matchData2 = {
                        id: match.id,
                        batch: match.batch,
                        isDraw: match.isDraw,
                        winner: match.player2.winner,
                        gameWins: match.player2.gameWins,
                        gameDrawn: match.player2.gameDrawn,
                        drop: match.player2.drop,
                        opponentId: match.player1.id,
                        opponentName: match.player1.name,
                        opponentGameWins: match.player1.gameWins,
                    }
                    let player2index = app.tournaments[tournamentIndex].attendees.findIndex(x => x.id == match.player2.id);
                    console.log("Adding match (2) for index:" + player2index + " name: " + app.tournaments[tournamentIndex].attendees[player2index].name);
                    app.tournaments[tournamentIndex].attendees[player2index].matches.push(matchData2);
                    if(matchData2.drop) {
                        app.tournaments[tournamentIndex].attendees[player2index].haveDropped = true;
                    }
                    if(matchData2.opponentId == "*** BYE ***") {
                        app.tournaments[tournamentIndex].attendees[player2index].haveByeMatch = true;
                    }
                }
            });
        });

        console.log("Active Tournament Object");
        console.log(app.activeTournament);

        console.log("Tournament Object");
        console.log(app.tournaments);

        app.saveLocalStorage();
    }
    app.unPairMatch = function(matchId) {

        if(confirm("Are you sure you want to unpair players?")) {
            let matchIndex = app.activeBatch.matches.findIndex(x => x.id == matchId);
            if(app.activeMatch.id == matchId) {
                app.activeMatch = '';
            }

            let player1 = app.activeBatch.matches[matchIndex].player1;
            player1.segment = app.activeBatch.matches[matchIndex].match;

            let player2 = app.activeBatch.matches[matchIndex].player2;
            player2.segment = app.activeBatch.matches[matchIndex].match;
            
            app.activeBatch.unPairedPlayers.push(player1);
            if(player2.id != "*** BYE ***") {
                app.activeBatch.unPairedPlayers.push(player2);
            }
    
            app.activeBatch.matches.splice(matchIndex, 1);
    
            app.saveLocalStorage();
        }

    }
    app.selectAttendeeToPairManual = function(attendee) {
        attendee.selected = !attendee.selected;
        let countSelected = app.activeBatch.unPairedPlayers.reduce(function(obj, attendee) {
            obj[attendee.selected] = (obj[attendee.selected] || 0) + 1;
            return obj;
        }, {});
        console.log(countSelected);
        if(countSelected[true] > 2) { attendee.selected = !attendee.selected; }

        app.unpairedPlayersListFiltered();
    }
    app.manuallyPairAttendees = function(type) {
        let countSelected = app.activeBatch.unPairedPlayers.reduce(function(obj, attendee) {
            obj[attendee.selected] = (obj[attendee.selected] || 0) + 1;
            return obj;
        }, {});
        if(countSelected[true] == undefined || app.manualPairingSegment == null) {
            alert("You have to select a segment and attendee(s) to pair any kind of match...");
            return
        }

        switch(type) {
            case 'match':
                console.log("About to pair attendees manually (match)...");
                if(countSelected[true] < 2) {
                    alert("You have to select two player to create pair a match...");
                }
                else {
                    let attendeesToPair = [];
                    for(let i = 0; i < app.activeBatch.unPairedPlayers.length; i++) {
                        if(app.activeBatch.unPairedPlayers[i].selected) { 
                            attendeesToPair.push(app.activeBatch.unPairedPlayers[i]);
                            app.activeBatch.unPairedPlayers.splice(i, 1);
                            i--;
                        }
                    }

                    let matchData = app.newMatchData(app.activeBatch.number, parseInt(app.manualPairingSegment), 'byManual', attendeesToPair[0].id, attendeesToPair[0].name, attendeesToPair[1].id, attendeesToPair[1].name);
                    app.activeBatch.matches.push(matchData);
                }
                
                app.saveLocalStorage();
                break;

            case 'bye':
                console.log("About to pair attendee manually (bye match)...");
                if(countSelected[true] < 1) {
                    alert("You can only have one attendee selected to create a BYE match...");
                }
                else {
                    let attendeeIndex = app.activeBatch.unPairedPlayers.findIndex(x => x.selected == true);
                    let attendee = app.activeBatch.unPairedPlayers[attendeeIndex];
                    let matchData = app.newByeMatchData(app.activeBatch.number, parseInt(app.manualPairingSegment), 'byManual', attendee.id, attendee.name);
                    app.activeBatch.matches.push(matchData);
                    app.activeBatch.unPairedPlayers.splice(attendeeIndex, 1);
                }

                app.saveLocalStorage();
                break;
        }
    }
    app.generatePairings = function() {
        let index = app.tournaments.findIndex(x => x.id == app.activeTournament.id);
        let batchIndex = app.tournaments[index].batches.findIndex(x => x.number == app.tournaments[index].status.activeBatchNumber);
        let byStandings = app.tournaments[index].batches[batchIndex].pairings.byStandings;
        let byRandom = app.tournaments[index].batches[batchIndex].pairings.byRandom;
        
        let attendees = [];
        app.tournaments[index].attendees.forEach(attendee => {
            if(!attendee.haveDropped) {
                attendees.push(attendee);
            }
        });
        
        let matchCount = 1;
        let matches = [];
        let pairingsOk = true;
        
        // pair matches by standings
        for(let i = 1; i <= byStandings; i++) {
            console.log("RUN BY STANDINGS PAIRING MODULE FOR ROUND " + i + " of " + byStandings);
            pairingsOk = app.pairingsByStandings(app.tournaments[index].status.activeBatchNumber, matchCount, attendees, matches);
            if(!pairingsOk) { return }
            console.log("==========================================");
            matchCount++;
        }
        console.log(matches);
        
        // pair random matches
        for(let i = 1; i <= byRandom; i++) {
            console.log("RUN BY RANDOM PAIRING MODULE FOR ROUND " + i + " of " + byRandom);
            pairingsOk = app.pairingsByRandom(app.tournaments[index].status.activeBatchNumber, matchCount, attendees, matches);
            if(!pairingsOk) { return }
            console.log("==========================================");
            matchCount++;
        }
        console.log(matches);
        
        // add matche to batch
        matches.forEach(match => {
            if(match.player2.id == "*** BYE ***") {
                match.isReported = true;
                match.player1.winner = true;
                match.player1.gameWins = 2;
                match.player2.gameWins = 0;
                match.player1.gameDrawn = 0;
                match.player2.gameDrawn = 0;
            }
            app.tournaments[index].batches[batchIndex].matches.push(match);
        });
        
        
        app.tournaments[index].batches[batchIndex].isPaired = true;
        
        app.setTournamentStatus(index, 3);
        app.saveLocalStorage();

        console.log(app.activeBatch);

    }
    app.pairingsByStandings = function(batchNumber, matchNumber, attendees, matches) {
        
        // shuffle players array
        let attendeeList = app.shuffleArray(JSON.parse(JSON.stringify(attendees)));
        console.log(attendeeList);

        var newMatches = [];

        console.log("****************************************************");
        console.log("******  STANDINGS Pairing for batch " + batchNumber + " started! ****");
        console.log("****************************************************");

        // create checkers
        let pairingsDone = false;
        let pairingsFailed = false;
        let pairingAttempt = 1;

        // >>> 1) start main pairing loop
        while (!pairingsDone) {
            // set checker
            pairingsFailed = false;

            // check number of fail attempts
            if (pairingAttempt > app.maxAttempts) {
                console.log("PAIRINGS FAILED! ==> Maximum number of attemts (" + app.maxAttempts + ") was reached");
                break;
            }
            else {
                console.log("PAIRING ATTEMPT (" + pairingAttempt + ") STARTED!");
            }

            // clear matches
            newMatches.length = 0;

            // empty players array
            attendeeList.length = 0;

            // get all active players (dropped = false) and shuffle
            attendeeList = app.shuffleArray(JSON.parse(JSON.stringify(attendees)));

            // order players by winnings
            attendeeList.sort((a, b) => (a.stats.mp > b.stats.mp) ? -1 : ((b.stats.mp > a.stats.mp) ? 1 : 0));


            // >>> 2) start inner loop
            while (!pairingsFailed) {
                // check if bye is needed
                if (attendeeList.length & 1) {
                    console.log("Player count is odd. Setting up bye match.");
                    // loop from bottom until player without bye receives bye
                    for (let i = attendeeList.length - 1; i > -1; i--) {
                        console.log(":: Checking if " + attendeeList[i].name + " has bye match in any of the previous batches...");
                        if (attendeeList[i].haveByeMatch == true) {
                            console.log(attendeeList[i].name + " already have bye match...");
                            continue;
                        }

                        console.log(":: Checking if " + attendeeList[i].name + " has bye match in current batch...");
                        if (matches.findIndex(x => x.player1.id == attendeeList[i].id && x.player2.id == "*** BYE ***" ) != -1) {
                            console.log(attendeeList[i].name + " already have bye match...");
                            continue;
                        }
                        
                        // create round data object for event
                        let roundMatchData = app.newByeMatchData(batchNumber, matchNumber, 'byStandings', attendeeList[i].id, attendeeList[i].name);
                        // add match to events round data
                        console.log("--> BYE Match crated.");
                        newMatches.push(roundMatchData);
                        // remove player from array
                        attendeeList.splice(i, 1);
                        // break loop
                        break;
                    }
                }

                // start pairings
                console.log("Start pairing players...");
                console.log("");
                let matchNum = 1;
                while (attendeeList.length > 0) {
                    console.log("==> Players left to pair: " + attendeeList.length);
                    console.log("Trying to create match: " + matchNum);
                    
                    let attendeeIndex = app.activeTournament.attendees.findIndex(x => x.id == attendeeList[0].id);

                    var opponentIndex = 1;
                    var pairAgain = true;
                    for (let i = 1; i < app.maxDownPair; i++) {
                        if (i >= attendeeList.length) {
                            console.log("index:" + i + " greather than attendee list...");
                            continue;
                        }
                        
                        let hasPlayed = false;
                        let shallPlay = false;

                        // matches in this batch
                        matches.forEach(match => {
                            if(match.player1.id == attendeeList[0].id && match.player2.id == attendeeList[i].id) { shallPlay = true; }
                            if(match.player2.id == attendeeList[0].id && match.player1.id == attendeeList[i].id) { shallPlay = true; }
                        });
                        
                        // previous played matches
                        if(app.activeTournament.attendees[attendeeIndex].matches.findIndex(x => x.opponentId == attendeeList[i].id) != -1) { hasPlayed = true; }
                        
                        if (hasPlayed) {
                            console.log("--> Attempt " + i + " failed... (" + attendeeList[0].name + " already played against " + attendeeList[i].name + " during earlier batch");
                            opponentIndex = i;
                        }
                        else if (shallPlay) {
                            console.log("--> Attempt " + i + " failed... (" + attendeeList[0].name + " already paired against " + attendeeList[i].name + " during this batch");
                            opponentIndex = i;
                        }
                        else {
                            opponentIndex = i;
                            pairAgain = false;
                            break;
                        }
                    }

                    if (pairAgain) {
                        opponentIndex = 1;
                        console.log("========================== !!! Tried to match against " + app.maxDownPair + " players without success, pairing against first again!");
                    }

                    console.log("Pairing " + attendeeList[0].name + " against " + attendeeList[opponentIndex].name);


                    // create round data object for event
                    let roundMatchData = app.newMatchData(batchNumber, matchNumber, 'byStandings', attendeeList[0].id, attendeeList[0].name, attendeeList[opponentIndex].id, attendeeList[opponentIndex].name);

                    // add match to events round data
                    newMatches.push(roundMatchData);

                    // remove players when paired
                    attendeeList.splice(opponentIndex, 1);
                    attendeeList.shift();

                    // increase match counter
                    matchNum++;
                }

                if (attendeeList.length == 0) {
                    pairingsDone = true;
                    break;
                }
            }
        }

        if (pairingsDone) {
            console.log("Pairings done!");
            newMatches.forEach(match => {
                matches.push(match);
            });
            return true;
        }
        else {
            console.log("=== PAIRINGS FAILED ===");
            alert("Pairings by standings failed for sequence " + matchCount);
            return false;
        }
    }
    app.pairingsByRandom = function(batchNumber, matchNumber, attendees, matches) {

        // shuffle players array
        let attendeeList = app.shuffleArray(JSON.parse(JSON.stringify(attendees)));
        
        console.log("Random pairings started.");
        console.log(":: Need to create matches for " + attendeeList.length + " players.");
        
        // check if bye is needed (odd player count)
        if (attendeeList.length & 1) {
            console.log(":: Player count is odd. Setting up bye match.");
            // create match data object for players
            for(let i = 0; i < attendeeList.length; i++) {
                console.log(":: Checking if " + attendeeList[i].name + " has bye match...");
                let hasByeMatch = false;
                if(app.activeTournament.attendees[app.activeTournament.attendees.findIndex(x => x.id == attendeeList[i].id)].haveByeMatch) {
                    hasByeMatch = true;
                }
                else {
                    matches.forEach(match => {
                        if(match.player1.id == attendeeList[i].id && match.player2.id == "*** BYE ***") { 
                            hasByeMatch = true;
                        }
                    });
                }

                if(!hasByeMatch) {
                    console.log(":: No BYE match, setting up BYE match...");
                    let matchData = app.newByeMatchData(batchNumber, matchNumber, 'byRandom', attendeeList[i].id, attendeeList[i].name);
                    // add match to matches
                    matches.push(matchData)
                    // remove player from array
                    attendeeList.splice(i, 1);

                    i = attendeeList.length;
                }
                else {
                    console.log(":: BYE match found, moving on th next attendee...");
                }
            }
        }

        while (attendeeList.length > 0) {
            console.log(":: Trying to create match for player: " + attendeeList[0].name + ":" + attendeeList[0].id);
            let attendeeIndex = app.activeTournament.attendees.findIndex(x => x.id == attendeeList[0].id);
            let attendee = app.activeTournament.attendees[attendeeIndex];
            // loop through attendee list to find opponent
            for(let i = 1; i < attendeeList.length; i++) {
                // check if attendee has played attendee i
                console.log(":: Checking to see if " + attendee.name + " and " + attendeeList[i].name + " have played...");
                let hasPlayed = false;
                // previous played matches
                if(attendee.matches.findIndex(x => x.opponentId == attendeeList[i].id) != -1) { hasPlayed = true; }
                // matches in this batch
                matches.forEach(match => {
                    if(match.player1.id == attendee.id && match.player2.id == attendeeList[i].id) { hasPlayed = true; }
                    if(match.player2.id == attendee.id && match.player1.id == attendeeList[i].id) { hasPlayed = true; }
                });
                if(!hasPlayed) {
                    console.log(":: No duplicate");
                    // create round data object for event
                    let matchData = app.newMatchData(batchNumber, matchNumber, 'byRandom', attendeeList[0].id, attendeeList[0].name, attendeeList[i].id, attendeeList[i].name);
                    // add match to events round data
                    console.log(":: Adding match data...");
                    //console.log(roundMatchData);
                    matches.push(matchData);
                    // remove attendees when paired
                    attendeeList.splice(i, 1);
                    attendeeList.shift();

                    i = attendeeList.length;
                }
                else {
                    if(attendeeList.length == 2) {
                        console.log(":: Duplicate found, only two players left...pairing anyways");
                        // create round data object for event
                        let matchData = app.newMatchData(batchNumber, matchNumber, 'byRandom', attendeeList[0].id, attendeeList[0].name, attendeeList[i].id, attendeeList[i].name);
                        // add match to events round data
                        console.log(":: Adding match data...");
                        //console.log(roundMatchData);
                        matches.push(matchData);
                        // remove attendees when paired
                        attendeeList.splice(i, 1);
                        attendeeList.shift();
                    }
                    else {
                        console.log(":: Duplicate found, moving to next attendee...");
                    }
                }
            }   
        }

        console.log(":: All pairings done, returning...");
        return true;
    }
    app.pairingsByRandom__TESTING = function(batchNumber, matchNumber, attendees, matches) {

        // shuffle players array
        let attendeeList = app.shuffleArray(JSON.parse(JSON.stringify(attendees)));
        console.log(attendeeList);

        var newMatches = [];

        console.log("****************************************************");
        console.log("******  RANDOM Pairing for batch " + batchNumber + " started! *******");
        console.log("****************************************************");

        // create checkers
        let pairingsDone = false;
        let pairingsFailed = false;
        let pairingAttempt = 1;

        // >>> 1) start main pairing loop
        while (!pairingsDone) {
            // set checker
            pairingsFailed = false;

            // check number of fail attempts
            if (pairingAttempt > app.maxAttempts) {
                console.log("PAIRINGS FAILED! ==> Maximum number of attemts (" + app.maxAttempts + ") was reached");
                break;
            }
            else {
                console.log("PAIRING ATTEMPT (" + pairingAttempt + ") STARTED!");
            }

            // clear matches
            newMatches.length = 0;

            // empty players array
            attendeeList.length = 0;

            // get all active players (dropped = false) and shuffle
            attendeeList = app.shuffleArray(JSON.parse(JSON.stringify(attendees)));

            // >>> 2) start inner loop
            while (!pairingsFailed) {
                // check if bye is needed
                if (attendeeList.length & 1) {
                    console.log("Player count is odd. Setting up bye match.");
                    // loop from bottom until player without bye receives bye
                    for (let i = attendeeList.length - 1; i > -1; i--) {
                        console.log(":: Checking if " + attendeeList[i].name + " has bye match in any of the previous batches...");
                        if (attendeeList[i].haveByeMatch == true) {
                            console.log(attendeeList[i].name + " already have bye match...");
                            continue;
                        }

                        console.log(":: Checking if " + attendeeList[i].name + " has bye match in current batch...");
                        if (matches.findIndex(x => x.player1.id == attendeeList[i].id && x.player2.id == "*** BYE ***" ) != -1) {
                            console.log(attendeeList[i].name + " already have bye match...");
                            continue;
                        }
                        
                        // create round data object for event
                        let roundMatchData = app.newByeMatchData(batchNumber, matchNumber, 'byRandom', attendeeList[i].id, attendeeList[i].name);
                        // add match to events round data
                        console.log("--> BYE Match crated.");
                        newMatches.push(roundMatchData);
                        // remove player from array
                        attendeeList.splice(i, 1);
                        // break loop
                        break;
                    }
                }

                // start pairings
                console.log("Start pairing players...");
                console.log("");
                let matchNum = 1;
                while (attendeeList.length > 0) {
                    console.log("==> Players left to pair: " + attendeeList.length);
                    console.log("Trying to create match: " + matchNum);
                    
                    let attendeeIndex = app.activeTournament.attendees.findIndex(x => x.id == attendeeList[0].id);

                    var opponentIndex = 1;
                    var pairAgain = true;
                    for (let i = 1; i < attendeeList.length; i++) {
                        if (i >= attendeeList.length) {
                            console.log("index:" + i + " greather than attendee list...");
                            continue;
                        }
                        
                        let hasPlayed = false;
                        let shallPlay = false;

                        // matches in this batch
                        matches.forEach(match => {
                            if(match.player1.id == attendeeList[0].id && match.player2.id == attendeeList[i].id) { shallPlay = true; }
                            if(match.player2.id == attendeeList[0].id && match.player1.id == attendeeList[i].id) { shallPlay = true; }
                        });
                        
                        // previous played matches
                        if(app.activeTournament.attendees[attendeeIndex].matches.findIndex(x => x.opponentId == attendeeList[i].id) != -1) { hasPlayed = true; }
                        
                        if (hasPlayed) {
                            console.log("--> Attempt " + i + " failed... (" + attendeeList[0].name + " already played against " + attendeeList[i].name + " during earlier batch)");
                            opponentIndex = i;
                        }
                        else if (shallPlay) {
                            console.log("--> Attempt " + i + " failed... (" + attendeeList[0].name + " already paired against " + attendeeList[i].name + " during this batch");
                            opponentIndex = i;
                        }
                        else {
                            opponentIndex = i;
                            pairAgain = false;
                            break;
                        }
                    }

                    if (pairAgain) {
                        opponentIndex = 1;
                        let num = attendeeList.length - 1;
                        console.log("========================== !!! Tried to match against " + num + " players without success, pairing against first again!");
                    }

                    console.log("Pairing " + attendeeList[0].name + " against " + attendeeList[opponentIndex].name);


                    // create round data object for event
                    let roundMatchData = app.newMatchData(batchNumber, matchNumber, 'byRandom', attendeeList[0].id, attendeeList[0].name, attendeeList[opponentIndex].id, attendeeList[opponentIndex].name);

                    // add match to events round data
                    newMatches.push(roundMatchData);

                    // remove players when paired
                    attendeeList.splice(opponentIndex, 1);
                    attendeeList.shift();

                    // increase match counter
                    matchNum++;
                }

                if (attendeeList.length == 0) {
                    pairingsDone = true;
                    break;
                }
            }
        }

        if (pairingsDone) {
            console.log("Pairings done!");
            newMatches.forEach(match => {
                matches.push(match);
            });
            return true;
        }
        else {
            console.log("=== PAIRINGS FAILED ===");
            alert("Pairings by standings failed for sequence " + matchCount);
            return false;
        }
    }
    app.calculateStats = function() {
        // gather information for player stats (not Opponent Match/Game Win Percentages)
        console.log("calculating stats for " + app.activeTournament.attendees.length + " players...");
        for (let attendee of app.activeTournament.attendees) {
            console.log(":: PLAYER: " + attendee.name);
            let attendeeData = {
                id: attendee.id,
                wins: 0,
                losses: 0,
                draws: 0,
                mp: 0,
                gp: 0,
                mwp: 0,
                gwp: 0,
                omwp: 0,
                ogwp: 0,
                adj_mp: 0,
                adj_gp: 0,
                adj_mwp: 0,
                adj_gwp: 0,
                matchesPlayed: 1,
                gamesPlayed: 0,
            }

            // calculate wins & losses
            for (let match of attendee.matches) {

                if(match.isDraw) {
                    attendeeData.mp += 1;
                    attendeeData.draws++;
                }
                else if(match.winner) {
                    attendeeData.mp += 3;
                    attendeeData.wins++;
                }
                else if(!match.winner) {
                    attendeeData.losses++;
                }

                // increase gvp
                attendeeData.gp += match.gameWins * 3;
                attendeeData.gp += match.gameDrawn * 1;

                // increase matchesPlayed
                attendeeData.gamesPlayed += match.gameWins;
                attendeeData.gamesPlayed += match.opponentGameWins;
                attendeeData.gamesPlayed += match.gameDrawn;
                
                // check for drop
                if (match.drop) {
                    attendee.haveDropped = true;
                }
            }
            console.log(":: wins an losses calculated");

            // set rounds player have played
            attendeeData.matchesPlayed = attendee.matches.length;

            // calculate mwp (Match Win Percentage)
            attendeeData.mwp = Number( (attendeeData.mp / (3 * attendeeData.matchesPlayed) ).toFixed(6) );
            if (attendeeData.mwp < 0.33) { attendeeData.mwp = 0.33; }

            // calculate gwp (Game Win Percentage)
            attendeeData.gwp = Number( (attendeeData.gp / (3 * attendeeData.gamesPlayed) ).toFixed(6) );
            // if (attendeeData.gwp < 0.33) { attendeeData.gwp = 0.33; } // according to Wizards Reproter there is no raising to 0.33 on GW%
            

            console.log(":: match & game-win percentage calculated");

            // calculate adjusted values (To be used for Opponent Match/Game Win Percentages where BYES are present)
            if (attendee.haveByeMatch) {
                attendeeData.adj_mp = attendeeData.mp - 3;
                attendeeData.adj_gp = attendeeData.gp - 6;
                attendeeData.adj_mwp = Number( (attendeeData.adj_mp / (3 * (attendeeData.matchesPlayed - 1) ) ).toFixed(6) );
                if (attendeeData.adj_mwp < 0.33) { attendeeData.adj_mwp = 0.33; }
                attendeeData.adj_gwp = Number( ( attendeeData.adj_gp / (3 * (attendeeData.gamesPlayed - 2) ) ).toFixed(6) );
                if (attendeeData.adj_gwp < 0.33) { attendeeData.adj_gwp = 0.33; }
            }
            else {
                attendeeData.adj_mp = attendeeData.mp;
                attendeeData.adj_gp = attendeeData.gp;
                attendeeData.adj_mwp = parseFloat(Number(attendeeData.mwp).toFixed(6));
                attendeeData.adj_gwp = parseFloat(Number(attendeeData.gwp).toFixed(6));
            }

            attendee.stats.wins = attendeeData.wins;
            attendee.stats.losses = attendeeData.losses;
            attendee.stats.draws = attendeeData.draws;
            attendee.stats.mp = attendeeData.mp;
            attendee.stats.gp = attendeeData.gp;
            attendee.stats.mwp = attendeeData.mwp.toFixed(4);
            attendee.stats.gwp = attendeeData.gwp.toFixed(4);
            attendee.stats.omwp = attendeeData.omwp.toFixed(4);
            attendee.stats.ogwp = attendeeData.ogwp.toFixed(2);
            attendee.stats.adj_mp = attendeeData.adj_mp.toFixed(6);
            attendee.stats.adj_gp = attendeeData.adj_gp.toFixed(6);
            attendee.stats.adj_mwp = attendeeData.adj_mwp.toFixed(6);
            attendee.stats.adj_gwp = attendeeData.adj_gwp.toFixed(6);
        }

        // gather information for player stats (Opponent Match/Game Win Percentages)
        for (let attendee of app.activeTournament.attendees) {
            let attendeeIndex = app.activeTournament.attendees.findIndex(x => x.id == attendee.id);
            let opponentCount = 0;
            let omwpSum = 0;
            let ogwpSum = 0;
            let omwp = 0;
            let ogwp = 0;

            // loop through matches and sum upp opponents match/game win percentage
            for (let match of attendee.matches) {
                if (match.opponentId != "*** BYE ***") {
                    let opponentIndex = app.activeTournament.attendees.findIndex(x => x.id == match.opponentId);
                    omwpSum += parseFloat(app.activeTournament.attendees[opponentIndex].stats["adj_mwp"]);
                    // ogwpSum += parseFloat(app.activeTournament.attendees[opponentIndex].stats["adj_gwp"]); // according to Wizards Report, there is no raising to 0.33 om OGW%
                    ogwpSum += parseFloat(app.activeTournament.attendees[opponentIndex].stats["gwp"]);
                    opponentCount++;
                }
            }

            // perform calculation
            if(opponentCount > 0) {
                omwp = Number( (omwpSum / opponentCount).toFixed(6) );
                ogwp = Number( (ogwpSum / opponentCount).toFixed(6) );
            }
            
            app.activeTournament.attendees[attendeeIndex].stats.omwp = omwp.toFixed(6);
            app.activeTournament.attendees[attendeeIndex].stats.ogwp = ogwp.toFixed(6);

        }

        console.log(":: opponent match & game-win percentage calculated");
        console.log(":: all stats for all players updated and changes saved to event");
        app.saveLocalStorage();
    }
    app.shuffleArray = function(array) {
        let ctr = array.length;
        let temp;
        let index;

        // While there are elements in the array
        while (ctr > 0) {
            // Pick a random index
            index = Math.floor(Math.random() * ctr);
            // Decrease ctr by 1
            ctr--;
            // And swap the last element with it
            temp = array[ctr];
            array[ctr] = array[index];
            array[index] = temp;
        }
        return array;
    }
    app.startTournament = function(id) {
        let index = app.tournaments.findIndex(x => x.id == id);

        app.setTournamentStatus(index, 1);
    }
    app.setTournamentStatus = function(index, statusCode) {
        let status = [
            "Unstarted",                                // 0
            "Started - Attendee registration closed",   // 1
            "Batch started - Waiting for pairings",     // 2
            "Batch paired - Waiting for results",       // 3
            "Batch finished - All results reported",    // 4
            "Batch ended",                              // 5
        ]
        app.tournaments[index].status.code = statusCode;
        app.tournaments[index].status.text = status[statusCode]; 
    }
    app.sortMatchListColumn = function(column) {
        console.log("Start sorting the match list.");
        app.sorting.matchList[column] = !app.sorting.matchList[column];
        switch(column) {
            case 'playerOne':
                if(app.sorting.matchList[column]) {
                    app.activeBatch.matches.sort(function (a, b) { return (a.player1.name > b.player1.name) ? -1 : ((b.player1.name > a.player1.name) ? 1 : 0); });
                }
                else {
                    app.activeBatch.matches.sort(function (a, b) { return (a.player1.name > b.player1.name) ? 1 : ((b.player1.name > a.player1.name) ? -1 : 0); });
                }
                break;
            case 'playerTwo':
                if(app.sorting.matchList[column]) {
                    app.activeBatch.matches.sort(function (a, b) { return (a.player2.name > b.player2.name) ? -1 : ((b.player2.name > a.player2.name) ? 1 : 0); });
                }
                else {
                    app.activeBatch.matches.sort(function (a, b) { return (a.player2.name > b.player2.name) ? 1 : ((b.player2.name > a.player2.name) ? -1 : 0); });
                }
                break;
            case 'segment':
                    if(app.sorting.matchList[column]) {
                        app.activeBatch.matches.sort(function (a, b) { return (a.match > b.match) ? -1 : ((b.match > a.match) ? 1 : 0); });
                    }
                    else {
                        app.activeBatch.matches.sort(function (a, b) { return (a.match > b.match) ? 1 : ((b.match > a.match) ? -1 : 0); });
                    }
                    break;

        }
    }
    app.guid = function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    app.getPercentage = function(value) {
        let newValue = value * 100;
        return newValue.toFixed(2) + "%";
    }
    app.numbersArray = function(number) {
        return new Array(number);
    }
    app.havePlayedEachOther = function(player1id, player2id) {
        let player1index = app.activeTournament.attendees.findIndex(x => x.id == player1id);
        let player2index = app.activeTournament.attendees.findIndex(x => x.id == player2id);
        
        if(app.activeTournament.attendees[player1index].matches.findIndex(x => x.opponentId == player2id) != -1 && app.activeTournament.attendees[player2index].matches.findIndex(x => x.opponentId == player1id) != -1) {
            return true;
        }
        else {
            return false;
        }
    }
    app.downloadJSON = function(tournamentId) {
        let tournamentIndex = app.tournaments.findIndex(x => x.id == tournamentId);
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(app.tournaments[tournamentIndex]));
        var downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", app.tournaments[tournamentIndex].name + ".json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
    app.importTournament = function() {
        var input, file, fr;

        if (typeof window.FileReader !== 'function') {
            console.log("The file API isn't supported on this browser yet.");
            return;
        }

        input = document.getElementById('fileInput');
        if (!input) {
            console.log("Um, couldn't find the fileinput element.");
        }
        else if (!input.files) {
            console.log("This browser doesn't seem to support the `files` property of file inputs.");
        }
        else if (!input.files[0]) {
            console.log("Please select a file before clicking 'Load'");
        }
        else {
            file = input.files[0];
            var reader = new FileReader();
            reader.onload = function(evt) {
                let event = JSON.parse(evt.target.result);

                if(event.id && event.name && event.batches && event.attendees) {
                    console.log(event);
                    app.tournaments.push(event);
                    app.saveLocalStorage();
                    location.reload();
                }
                else {
                    alert("JSON file does not contain a tournament...");
                }
            };
            reader.readAsText(file);
        }

    }
    app.reportAllMatches = function() {

        app.activeBatch.matches.forEach(match => {
            if(!match.isReported) {
                match.isReported = true;
                match.player1.winner = true;
                match.player1.gameWins = 2;
                match.player1.gameDrawn = 0;
                match.player2.gameWins = Math.round(Math.random());
                match.player2.gameDrawn = 0;
            }
        })

    }
    app.exportTableTo_CSV = function(tableName) {
        let filename = app.activeTournament.name;
        let csv = [];

        if(tableName == 'matches') {
            filename += " - Matches for Batch " + app.activeBatch.number;
            let header = 'Segment,Player One,Player Two'
            csv.push(header);
            app.activeBatch.matches.forEach(match => {
                let matchRow = match.match + ',' + match.player1.name + ',' + match.player2.name;
                csv.push(matchRow);
            });
        }

        if(tableName == 'attendees') {
            filename += " - Standings";
            let header = 'Name,Matches,Match Points,OMW%,GW%,OGW%'
            csv.push(header);
            app.activeTournament.attendees.forEach(attendee => {
                let attendeeData = '';
                attendeeData += attendee.name + ',';
                attendeeData += attendee.matches.length + ',';
                attendeeData += attendee.stats.mp + ',';
                attendeeData += app.getPercentage(attendee.stats.omwp) + ',';
                attendeeData += app.getPercentage(attendee.stats.gwp) + ',';
                attendeeData += app.getPercentage(attendee.stats.ogwp);
                csv.push(attendeeData);
            });
        }

        filename += ".csv";

        // Download CSV
        let csvFile;
        let downloadLink;

        // CSV FILE
        csvFile = new Blob([csv.join("\n")], {type: "text/csv"});

        // Download link
        downloadLink = document.createElement("a");

        // File name
        downloadLink.download = filename;

        // We have to create a link to the file
        downloadLink.href = window.URL.createObjectURL(csvFile);

        // Make sure that the link is not displayed
        downloadLink.style.display = "none";

        // Add the link to your DOM
        document.body.appendChild(downloadLink);

        // Lanzamos
        downloadLink.click();
    }
});
