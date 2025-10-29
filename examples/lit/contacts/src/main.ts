import { App } from './app.ts';
import { CancelButton } from './custom-elements/cancel-button.ts';
import { DeleteButton } from './custom-elements/delete-button.ts';
import { Details } from './custom-elements/details.ts';
import { Favorite } from './custom-elements/favorite.ts';
import { EnhancedForm, EnhancedLink } from './custom-elements/router/enhance.ts';
import { RouterProvider } from './custom-elements/router/provider.ts';
import { SearchBar } from './custom-elements/search-bar.ts';
import { Sidebar, SidebarItem } from './custom-elements/sidebar.ts';

customElements.define(RouterProvider.tag, RouterProvider);
customElements.define(EnhancedLink.tag, EnhancedLink);
customElements.define(EnhancedForm.tag, EnhancedForm);

customElements.define(App.tag, App);
customElements.define(SearchBar.tag, SearchBar);
customElements.define(Sidebar.tag, Sidebar);
customElements.define(SidebarItem.tag, SidebarItem);
customElements.define(Favorite.tag, Favorite);
customElements.define(Details.tag, Details);
customElements.define(DeleteButton.tag, DeleteButton);
customElements.define(CancelButton.tag, CancelButton);
