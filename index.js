let options = {
    headers: new Headers({
        "Origin": "https://developer.riotgames.com",
        "Accept-Charset": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Riot-Token": "RGAPI-17581fbd-37bc-49cd-bea6-04b22cc9b76d", //This API key has to be refreshed every 24 hours.
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36"
    })
}

let proxyUrl = "https://cors-anywhere.herokuapp.com/" //Used to avoid CORS issues.
let riotSummonerName = ""

//This actually looks up the Summoner and Champion names. The first fetch using the summonerName returns the
//encrypted account ID, which is needed for the later fetches as that's what Riot wants us to use to access player
//data. The second fetch returns the champion ID, which is what Riot uses to access champion data instead of their
//names.
function lookUpSummonerName() {
    let championId = 0
    
    $('form').submit(function(event) {
        event.preventDefault();
        let summonerName = $('#summoner-name').val();
        let url = `https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${summonerName}`
        fetch(proxyUrl + url, options)
            .then(response => response.json())
            .then(responseJson => {
                let accountId = responseJson.accountId
                riotSummonerName = responseJson.name //Ensures the Summoner name matches what Riot has on file to avoid errors.
                let champion = $('option:checked').val();
                let url = `https://ddragon.leagueoflegends.com/cdn/9.3.1/data/en_US/champion/${champion}.json`
                fetch(url)
                    .then(response => {
                        if (response.status == 403) {
                            alert('Please enter a valid Champion name.')
                        } else {
                            fetch(url)
                                .then(response => response.json())
                                .then(responseJson => {
                                    championId = responseJson.data[champion].key   
                                    lookUpMatchLists(accountId, championId);     
                                })
                                .catch(error => alert(error))            
                        }
                    })
            })
            .catch(error => alert(error))
    })
};

//Returns the matches, filtered by the user and champion chosen by the user. Also limited to ranked matches
//(queue=420), and a max of 10 (endIndex=10) which is set because of the limits of the API key.
function lookUpMatchLists(accountId, championId) {
    let url = `https://na1.api.riotgames.com/lol/match/v4/matchlists/by-account/${accountId}?champion=${championId}&queue=420&endIndex=10`
    fetch(proxyUrl + url, options)
        .then(response => {
            if (response.status == 404) {
                alert('No matches found for this Champion')
            } else if (response.status == 400) {
                alert('Please enter a valid Summoner name.')
            } else {
                fetch(proxyUrl + url, options)
                    .then(response => response.json())
                    .then(responseJson => lookUpMatchInfo(responseJson))
                    .catch(error => alert(error))
            }
        })
};

//Analyses the matches to determine a win or a loss, as well as the final total, and displays it.
function lookUpMatchInfo(responseJson) {
    let win = 0
    let lose = 0
    let total = 0
    let matches = 0 //Due to the matches not being returned in order, this was needed to know when all of them had
                    //been returned so the final total could be calculated.

    for (i = 0; i < responseJson.matches.length; i++) {
    let url = `https://na1.api.riotgames.com/lol/match/v4/matches/${responseJson.matches[i].gameId}`
    fetch(proxyUrl + url, options)
        .then(response => response.json())
        .then(responseJson => getId(responseJson))
        .then(result => 
            fetch(proxyUrl + url, options)
                .then(response => response.json())
                .then(responseJson => getMatchResult(responseJson, result))
                .then(finalResult => {
                    if (finalResult == true) {
                        win++
                    } else {
                        lose++
                    }
                    matches++
                    if (matches == responseJson.matches.length) {
                        //The timeouts are accounting for the time it takes to get the results from Riot's API so
                        //the total isn't calculated too soon.
                        setTimeout(function() {
                            total = win/(win+lose)*100
                        }, 1000)
                        setTimeout(function() {
                            displayResults(total);
                        }, 1100)
                    }
                })
                .catch(error => console.log(error))
        .catch(error => console.log(error))
        )
    }
}

//Identifies the user in the matches, so their data can be pulled.
function getId(responseJson) {
    for (i = 0; i < responseJson.participantIdentities.length; i++) {
        if (responseJson.participantIdentities[i].player.summonerName == riotSummonerName) {
            let participantId = responseJson.participantIdentities[i].participantId
            return participantId
        }
    }
}

//Returns if the match for the user was a win or loss.
function getMatchResult(responseJson, result) {
    for (i = 0; i < responseJson.participants.length; i++) {
        if (responseJson.participants[i].participantId == result) {
            return responseJson.participants[i].stats.win
        }
    }
}

//Formats the percentage, removes the inputs, modifies the button to reset the form when the user is done, and
//displays a different image depending on how good the build is.
function displayResults(total) {
    let displayTotal = total.toFixed(2)
    if (displayTotal <= 50) {
        $('#go').replaceWith(`
            <button id="test-again">Test Again</button>
        `)

        $('input').remove()
        $('select').remove()

        $('#js-results').append(`
            <p>Your build has a</p>
            <p>${displayTotal}% win rate</p>
            <img id="wr-gif" src="./fail.gif">
        `)
    } else {
        $('#go').replaceWith(`
        <button id="test-again">Test Again</button>
        `)

        $('input').remove()
        $('select').remove()

        $('#js-results').append(`
            <p>Your build has a</p>
            <p>${displayTotal}% win rate</p>
            <img id="wr-gif" src="./victory.gif">
        `)
    }
}

function testAgain() {
    $('form').on('click', '#test-again', function() {
        event.preventDefault();
        location.reload();
    })
}

$(lookUpSummonerName())
$(testAgain())