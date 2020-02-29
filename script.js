function picChange(){
  if (document.getElementById('b').src.includes("pillow")) {
    document.getElementById('b').src="images/tshirt.gif";
  } else {
    document.getElementById('b').src="images/pillow.gif";
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
