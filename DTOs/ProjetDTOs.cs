using System.ComponentModel.DataAnnotations;
namespace GestionTachesProjets.DTOs;
/// <summary>
/// hammadi ness tayba dekhel bech yaamel commentaire ala tache noumrou 7 
/// y7eb yekteb "maquette validee " yji fel champ commentaire yekteb ech y7eb
/// el navigateur (POST/api/taches/7/commentaires) yebaath :
/// {"contenu":"Maquette valideee","membreId":2} 
/// el numero 7 mte3 el tache jey mel url wel be9i mel corp json
/// ASP.NET yer7am weldiha taamel conversion mel json lel CommentaireCreateDto
/// el controleur ydeclari el DTO fel parametre mte3ou (Model Binding) ,
///  donc el framework t3amer Contenu="Maquette validee" w membreId=2
/// ken el contenu feregh walla akther men 500 caractere walla el MembreId=0 , 
/// l'API traja3 erreur 400 , w el code mte3 el cotroleur meme pas execute 
/// el controleur yvrefifi hajtin:
/// tacheRepository.GetByIdAsync(7) : ken mafamech tache yraja3 404 
/// membreRepository.GetByIdAsync(2): ken ma famech membre yraja3 404 kifkif 
/// menghir les verifications hedhom el base traja3 500 
/// men ba3ad el controleur yaaamel construction lel Model 
/// var commentaire = new Commentaire 
/// {  
///    Contenu = dto.Contenu,
///    TacheId =7 , 
///    MembreId =dto.MembreId 
/// };
/// el Id wel DateCreation ma yjiwech mel client , Id mel base wel DateCreation mel Model 
/// el repository tsajel commentaire.Repository.AddAsync(commentaire)
/// et puis el controleur yaaamel copie men Commentaire msajla fi CommentaireDto 
/// men ba3ed : ASP.NET Core trajaa JSON w code 201 
/// 
/// 
/// </summary>
public class ProjetCreateDto // Client-------> yeb3ath lel API
{
    [Required(ErrorMessage ="Le nom est obligatoire")]
    [MaxLength(100)]
    public string Nom{get;set;} = string.Empty;
    [MaxLength(500)]
    public string? Description {get;set;}
}
public class ProjetDto // API------>tebaath lel client 
{
    public int Id {get;set;}
    public string Nom {get;set;}=string.Empty;
    public string? Description {get;set;}
}