let options = {
    headers: new Headers({
        "Origin": "https://developer.riotgames.com",
        "Accept-Charset": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Riot-Token": "RGAPI-f8d001a3-06f1-441c-ac9c-9282c2b2488c",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36"
    })
}

let proxyUrl = "https://cors-anywhere.herokuapp.com/"
let riotSummonerName = ""

function lookUpSummonerName() {
    let championId = 0
    
    $('form').submit(function(event) {
        event.preventDefault();
        let summonerName = $('#summoner-name').val();
        /*let value = summonerName.match(/[0-9\\p{L} _\\.]+/)
        console.log(value);*/
        let url = `https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${summonerName}`
        fetch(proxyUrl + url, options)
            .then(response => response.json())
            .then(responseJson => {
                let accountId = responseJson.accountId
                riotSummonerName = responseJson.name
                let champion = $('#champion-name').val();
                let url = `http://ddragon.leagueoflegends.com/cdn/6.24.1/data/en_US/champion/${champion}.json`
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

function lookUpMatchInfo(responseJson) {
    let win = 0
    let lose = 0
    let total = 0
    let matches = 0

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
                    console.log(finalResult)
                    if (finalResult == true) {
                        win++
                    } else {
                        lose++
                    }
                    matches++
                    console.log(matches)
                    console.log(i)
                    console.log(responseJson.matches.length)            
                    if (matches == responseJson.matches.length) {
                        setTimeout(function() {
                            total = win/(win+lose)*100
                            console.log(total)    
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

function getId(responseJson) {
    for (i = 0; i < responseJson.participantIdentities.length; i++) {
        if (responseJson.participantIdentities[i].player.summonerName == riotSummonerName) {
            let participantId = responseJson.participantIdentities[i].participantId
            return participantId
        }
    }
}

function getMatchResult(responseJson, result) {
    for (i = 0; i < responseJson.participants.length; i++) {
        if (responseJson.participants[i].participantId == result) {
            return responseJson.participants[i].stats.win
        }
    }
}

function winPercentage(finalResult) {
    if (finalResult == true) {
        win++
    } else {
        lose++
    }
}

function calculateTotal() {
    total = win/(win+lose)*100
}

function displayResults(total) {
    let displayTotal = total.toFixed(2)
    $('#go').replaceWith(`
        <button id="test-again">Test Again</button>
    `)

    $('input').remove()

    $('#js-results').append(`
        <p>Your build has a</p>
        <p>${displayTotal}% win rate</p>
    `)
}

function testAgain() {
    $('form').on('click', '#test-again', function() {
        event.preventDefault();
        location.reload();
    })
}

$(lookUpSummonerName())
$(testAgain())