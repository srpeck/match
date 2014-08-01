var element = document.getElementById('view');
var options = {
    preventDefault: true,
    dragLockToAxis: true,
    dragBlockHorizontal: true,
    holdTimeout: 1000
};
var hammertime = Hammer(element, options).on('drag swipe hold', function(event) {
    switch(event.type) {
    case 'drag':
    case 'swipe':
        latest_action = 'move ' + event.target.id;
        break;
    case 'hold':
        latest_action = 'attack ' + event.target.id;
        break;
    }
});
