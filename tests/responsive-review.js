const preview=document.getElementById('preview');
document.getElementById('width').addEventListener('change',event=>{preview.width=event.target.value;});
document.getElementById('page').addEventListener('change',event=>{preview.src=event.target.value;});
