function picChange(){
  if (document.getElementById('b').src.includes("bernie")) {
    console.log('wut');
    document.getElementById('b').src="images/medicare4all.png";
  } else {
    document.getElementById('b').src="images/bernie_slow.gif"
    console.log(document.getElementById('b').src);
  }
}


function imgShowHide() {
  console.log('hit funcc' + document.getElementById('a').style.visibility);
  if (document.getElementById('a').style.visibility == 'visible') {
    document.getElementById('a').style.visibility = 'hidden';
    console.log('h' + document.getElementById('a').style.visibility);
  } else {
    document.getElementById('a').style.visibility = 'visible'
    console.log('v' + document.getElementById('a').style.visibility);
  }
}
