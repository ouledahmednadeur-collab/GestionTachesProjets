namespace GestionTachesProjets.DTOs;
 public class PagedResult<T>
{
    public int Page{get;set;}
    public int PageSize{get;set;}
    public int Total{get;set;}
    public List<T> Items{get;set;}=new() ;
}
// houni naamlou f PagedResult bech nel9awha fi ay blasa fiha pagination donc ndeclariw 
// f les variables elli mest7a9inhom 