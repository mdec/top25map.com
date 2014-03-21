function PowerMap() {
    var self = this;
    
    self.RANKINGS           = rankings;   
    self.SEASONS            = Object.keys(self.RANKINGS);
    self.ICON_DIMENSIONS    = [0,   // unranked 
            100, 80, 70, 60, 50,    // 1-5
            45, 43, 41, 39, 37,     // 6-10
            35, 35, 35, 35, 35,     // 11-15
            30, 30, 30, 30, 30,     // 16-20
            25, 25, 25, 25, 25];    // 21-25
            
    self.DECREMENT_TEXT     = "&#x25C0;";   // left-pointing triangle, used in link to decrement week and season
    self.INCREMENT_TEXT     = "&#x25B6";    // right-pointing triangle, used in link to increment week and season
    
    self.sport          = "basketball";
    self.logoStyle      = ko.observable("Modern");
    self.logoFileType   = ko.observable("png");
            
    /*****
        Initialize map
    *****/
    
    self.mapCenter = new google.maps.LatLng(39, -95);

    var zoomOptions = {
        style : google.maps.ZoomControlStyle.SMALL,
        position : google.maps.ControlPosition.TOP_LEFT
    };
    
    var mapOptions = {
        zoom            : 5,
        maxZoom         : 12,
        center          : self.mapCenter,
        mapTypeId       : google.maps.MapTypeId.ROADMAP,
        mapTypeControl  : false,
        styles          : mapStyle,
        panControl      : false,
        streetViewControl : false,
        zoomControlOptions: zoomOptions
    }
    
    self.map = new google.maps.Map(
        document.getElementById('map'),
        mapOptions);
    
    self.map.fitBounds(new google.maps.LatLngBounds(
        new google.maps.LatLng(25, -125),
        new google.maps.LatLng(48, -75)
        ));
    
    /*****
        Non-reactive functions
    *****/
    
    self.constructTimeLink = function(type, linkText) {
        var linkHTML, onclickHTML;
        var capitalType = type.charAt(0).toUpperCase() + type.slice(1);
        if (!isNaN(parseInt(linkText))) onclickHTML = "powerMap." + type + "(" + linkText + ")";
        else onclickHTML = (linkText === self.DECREMENT_TEXT) ? "powerMap.decrement" + capitalType + "()" : "powerMap.increment" + capitalType + "()";
        var linkHTML = "<a href='#' onclick='" + onclickHTML + "'>" + linkText + "</a>";
        return(linkHTML);
    }
    
    self.preLoadLogo = function(teamName) {
        var imgHTML = "<img src='./Team logos/Modern/" + teamName + ".png'>";
        return(imgHTML);
    }
    
    self.getTeamMarkersInit = function(teamName) {
        var position = self.getLatLngByTeamName(teamName);
        var anchor   = new google.maps.Point(0, 0);
        var size     = new google.maps.Size(50, 50);
        
        var marker = new google.maps.Marker({
                position    : position,
                title       : teamName,
                icon        : {
                    anchor          : anchor,
                    scaledSize      : size,
                    url             : "./Team logos/" + self.logoStyle() + "/" + teamName + "." + self.logoFileType()
            }});
        
        marker.setMap(self.map);
        
        return(marker);
    }
    
    self.getLatLngByTeamName = function(teamName) {
        var latLngArray = latLngByTeamName[teamName];
        return(new google.maps.LatLng(latLngArray[0], latLngArray[1]));
    }
    
    self.getMarkerDimensionByRank = function(rank) {
        return(self.ICON_DIMENSIONS[rank]);
    }
    
    self.getMarkerSizeByRank = function(rank) {
        var dimension = self.getMarkerDimensionByRank(rank);
        return(new google.maps.Size(dimension, dimension));
    }
    
    self.getMarkerAnchorByRank = function(rank) {
        var dimension = self.getMarkerDimensionByRank(rank);
        var midPoint = Math.ceil(dimension / 2);
        return(new google.maps.Point(midPoint, midPoint));
    }
    
    self.getTeamNameById = function(teamId) {
        return(self.teamCrosswalk()[teamId]);   
    }
    
    self.teamCrosswalk = ko.observableArray();
    teamCrosswalk.map(
        function(value) {
            self.teamCrosswalk().push(value);
        });
    
    /*****
        Observables begin here
    *****/
    
    self.season = ko.observable(1998);
    self.week = ko.observable(1);
    
    self.teamMarkers = ko.observableArray(
        self.teamCrosswalk().map(self.getTeamMarkersInit)
        );
    
    self.seasonString = ko.computed( 
        function() {
            var seasonString = self.season().toString();
            return(seasonString);
        });
    
    self.weekString = ko.computed(
        function() {
            var weekString = self.week().toString();
            return(weekString);
        });
    
    self.logChange = ko.computed(
        function() {
            var currentTime = self.seasonString() + "-" + self.weekString();
            _gaq.push(['_trackEvent', 'timeChange', currentTime]);
        }).extend({ throttle: 1});
    
    // Get rankings data from current season and week
    self.rankingsThisSeason = ko.computed(
        function() {
            return(self.RANKINGS[self.seasonString()])
        }).extend({ throttle: 1});
    
    self.weeksThisSeason = ko.computed(
        function() {
            return(Object.keys(self.rankingsThisSeason()));
        }).extend({ throttle: 1});
        
    self.rankingsThisWeek = ko.computed(
        function() {
            var rankings = self.RANKINGS[self.seasonString()][self.weekString()];
            return(rankings);
        }).extend({ throttle: 1 });
        
    self.seasonTracker   = ko.computed(
        function() {
            var out = [self.DECREMENT_TEXT].concat(self.SEASONS).concat([self.INCREMENT_TEXT]);
            return(out);
        });
    
    self.weekTracker = ko.computed(
        function() {
            var out = [self.DECREMENT_TEXT].concat(self.weeksThisSeason()).concat([self.INCREMENT_TEXT]);
            return(out);
        });
    
    // Pull the ranked teams from the rankings data
    self.rankTableInfo = ko.computed(
        function() {
            var teamIds = self.rankingsThisWeek().ranks.teamId;
            var prevRanks = self.rankingsThisWeek().ranks.Prev;
            
            var rankedTeams = teamIds.map(
                function(teamId, teamIndex) {
                    var teamName = self.getTeamNameById(teamId);
                    var rank = teamIndex + 1;
                    var prevRank = prevRanks[teamIndex];
                    var preSpan;
                    
                    if (self.week() == 1) preSpan = "";
                    else if (prevRank === null) preSpan = "<span class='unranked'>NR</span>";
                    else {
                        var rankDiff = prevRank - rank;
                        var spanClass, spanText; 
                        
                        if (rankDiff == 0) {
                            spanClass = "sameranked";
                            spanText = "";
                        } else if (prevRank > rank) {
                            spanClass = "upranked";
                            spanText = "&#x25B2;" + Math.abs(rankDiff);
                        } else {
                            spanClass = "downranked";
                            spanText = "&#x25BC;" + Math.abs(rankDiff);
                        }
                        
                        preSpan = "<span class='" + spanClass + "'>" + spanText + "</span>";
                    }
                        
                    var out = teamName + " " + preSpan;
                    return(out);
                });
            return(rankedTeams);
        }).extend({ throttle: 1});
    
    self.getNextSeason = ko.computed(
        function() {
            var nextSeason = self.season() + 1;
            var nextSeasonString = nextSeason.toString();
            return(self.SEASONS.indexOf(nextSeasonString) > -1 ? nextSeason : self.season());
        });
        
    self.getPrevSeason = ko.computed(
        function() {
            var prevSeason = self.season() - 1;
            var prevSeasonString = prevSeason.toString();
            return(self.SEASONS.indexOf(prevSeasonString) > -1 ? prevSeason : self.season());
        });
        
    self.incrementSeason = function() {
        if (self.week() > self.lastWeekNextSeason()) self.week(self.lastWeekNextSeason());
        self.season(self.getNextSeason());
    }
    
    self.decrementSeason = function() {
        if (self.week() > self.lastWeekPrevSeason()) self.week(self.lastWeekPrevSeason());
        self.season(self.getPrevSeason()); 
    }
    
    self.lastWeekPrevSeason = ko.computed(
        function() {
            return(Object.keys(self.RANKINGS[self.getPrevSeason().toString()]).pop()); 
        }).extend({ throttle: 1});
    
    self.lastWeekNextSeason = ko.computed(
        function() {
            return(Object.keys(self.RANKINGS[self.getNextSeason().toString()]).pop());
        }).extend({ throttle: 1});
    
    self.getNextWeek = ko.computed(
        function() {
            var nextWeek = self.week() + 1;
            var nextWeekString = nextWeek.toString();
            return(self.weeksThisSeason().indexOf(nextWeekString) > -1 ? nextWeek : 1);
        });
        
    self.getPrevWeek = ko.computed(
        function() {
            var prevWeek = self.week() - 1;
            var prevWeekString = prevWeek.toString();
            return(self.weeksThisSeason().indexOf(prevWeekString) > -1 ? prevWeek : 1);
        });
        
    self.incrementWeek = function() {
        if (self.getNextWeek() > self.week()) self.week(self.getNextWeek())
        else if (self.SEASONS.indexOf(self.seasonString()) < self.SEASONS.length - 1) {
            self.incrementSeason();
            self.week(1);
        } else {
            // do nothing, you're at the latest week and season
        }
    }
    
    self.decrementWeek = function() {
        if (self.getPrevWeek() < self.week()) self.week(self.getPrevWeek())
        else if (self.SEASONS.indexOf(self.seasonString()) > 0) {
            self.week(self.lastWeekPrevSeason());
            self.decrementSeason();
        } else {
            // do nothing, you're at the earliest week and season
        }
    }
    
    // When rankings data updates, clear markers and create an observable array of new markers from the new data
    self.updateMarkers = ko.computed(
        function() {
            var rankedTeamIds = self.rankingsThisWeek().ranks.teamId;
            self.teamCrosswalk().map(
                function(teamName, teamIndex) {
                    var rank    = rankedTeamIds.indexOf(teamIndex) + 1;
                    var marker  = self.teamMarkers()[teamIndex];
                    var champ   = (self.getNextWeek() == 1);
                    
                    if (rank > 0) {
                        marker.setIcon({
                            anchor      : self.getMarkerAnchorByRank(rank),
                            scaledSize  : self.getMarkerSizeByRank(rank),
                            url         : "./Team logos/" + self.logoStyle() + "/" + teamName + "." + self.logoFileType()
                        });
                        
                        marker.setTitle(teamName + " (" + rank + ")");
                        marker.setZIndex(26 - rank);
                        
                        self.teamMarkers()[teamIndex] = marker;
                        self.teamMarkers()[teamIndex].setMap(self.map);
                        
                        if (champ & rank == 1) console.log("champs: " + teamName);
                        
                    } else self.teamMarkers()[teamIndex].setMap(null);
                });
        }).extend({ throttle: 1});
    
    return(self);
}        

powerMap = new PowerMap();
ko.applyBindings(powerMap);
    
function explainMap() {
    document.getElementById("splashText").innerHTML = "How To Use This Map:<p>" +
        "Use the red arrow buttons at bottom to scroll through seasons and weeks,&nbsp;" +
        "or choose a specific season or week with the corresponding buttons.&nbsp;<p>" +
        "The table on the left shows the rankings for the selected week, and the&nbsp;" +
        "logos on the map are sized according to each team's current ranking.<p>" +
        "<a id='enterMapLink' href='#'>Enter the map&nbsp;&#x25B6;</a>";
    document.getElementById("enterMapLink").onclick = enterMap;
}

function enterMap() {
    var elem = document.getElementById("grayOut");
    elem.parentNode.removeChild(grayOut);
}

window.onload = explainMap;

