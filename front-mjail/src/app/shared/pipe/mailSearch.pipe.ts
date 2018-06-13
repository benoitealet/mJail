import {Pipe, PipeTransform} from '@angular/core';
import * as Fuse from 'fuse.js';

@Pipe({
    name: 'mailSearch',
    pure: false
})



export class MailSearchPipe implements PipeTransform {
    
    private lastSearch;
    private lastResult;
    
    transform(items: any[], search: string): any {
        if(this.lastSearch == search) {
            return this.lastResult;
        }
        
        if (!items) {
            return [];
        }
        if (!search) {
            return items;
        }
        console.log('search', search);
        
        let options = {
            shouldSort: true,
            tokenize: true,
            matchAllTokens: true,
            threshold: 0,
            location: 0,
            distance: 100,
            maxPatternLength: 32,
            minMatchCharLength: 2,
            keys: [
                "subject",
                "from.address",
                "from.name",
                "to.address",
                "to.name",
            ]
        };

        console.log('end search');

        let fuse = new Fuse(items, options); // "list" is the item array
        let data = fuse.search(search);
        
        this.lastSearch = search;
        this.lastResult = data;
        
        return data;

    }
}