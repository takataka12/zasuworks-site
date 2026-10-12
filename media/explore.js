'use strict';
(() => {
  const form=document.getElementById('review-filters');
  if(!form) return;
  const cards=[...document.querySelectorAll('[data-review-card]')];
  const query=document.getElementById('review-search');
  const category=document.getElementById('category-filter');
  const topic=document.getElementById('topic-filter');
  const params=new URLSearchParams(location.search);
  const labels={create:'つくる',organize:'整える',record:'記録する',play:'楽しむ'};
  const assign=(select,value)=>{if([...select.options].some(o=>o.value===value))select.value=value;};
  assign(category,params.get('category')||'');assign(topic,params.get('topic')||'');
  query.value=(params.get('q')||'').slice(0,160);
  if(!cards.length){
    const notice=document.getElementById('selected-topic');
    if(labels[topic.value]){notice.textContent=`「${labels[topic.value]}」のレビューも、試用後に順次掲載します。`;notice.hidden=false;}
    return;
  }
  form.hidden=false;
  const normalize=text=>text.normalize('NFKC').toLocaleLowerCase('ja');
  function filter(){
    const terms=normalize(query.value.trim()).split(/\s+/).filter(Boolean);
    let count=0;
    for(const card of cards){
      const match=(!category.value||card.dataset.category===category.value)&&(!topic.value||card.dataset.topic===topic.value)&&terms.every(term=>normalize(card.dataset.search).includes(term));
      card.hidden=!match;if(match)count++;
    }
    document.getElementById('filter-count').textContent=`${cards.length}件中 ${count}件を表示`;
    document.getElementById('empty-search').hidden=count!==0;
    const url=new URL(location.href);
    for(const [key,value] of [['q',query.value.trim()],['category',category.value],['topic',topic.value]]){if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);}
    history.replaceState(null,'',url);
  }
  form.addEventListener('submit',event=>{event.preventDefault();filter();});
  form.addEventListener('input',filter);form.addEventListener('change',filter);
  form.addEventListener('reset',()=>{setTimeout(filter,0);});filter();
})();
